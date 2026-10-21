import crypto from 'node:crypto';
import { getPool } from '../config/db.js';
import { normalizeEmail } from '../utils/security.js';

/**
 * Transforms a raw database user row into a safe, client-facing profile
 * without password hashes or internal sensitive data.
 * @param {object} row Raw database row from `users`
 * @param {object} [preferences] Associated preferences row or formatted object
 * @returns {object} Safe user profile
 */
export function formatSafeUser(row, preferences = null) {
  if (!row) return null;

  const safe = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    userType: row.user_type,
    user_type: row.user_type,
    avatarColor: row.avatar_color,
    avatar_color: row.avatar_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (preferences) {
    safe.preferences = {
      appointmentConfirmations: Boolean(
        preferences.appointmentConfirmations !== undefined
          ? preferences.appointmentConfirmations
          : preferences.appointment_confirmations
      ),
      statusUpdates: Boolean(
        preferences.statusUpdates !== undefined
          ? preferences.statusUpdates
          : preferences.status_updates
      ),
      cancellationAlerts: Boolean(
        preferences.cancellationAlerts !== undefined
          ? preferences.cancellationAlerts
          : preferences.cancellation_alerts
      ),
      updatedAt: preferences.updated_at || preferences.updatedAt,
    };
  }

  return safe;
}

/**
 * Formats a raw user_preferences row into camelCase object.
 * @param {object} row
 * @returns {object|null}
 */
export function formatPreferences(row) {
  if (!row) return null;
  const appt = Boolean(
    row.appointmentConfirmations !== undefined
      ? row.appointmentConfirmations
      : row.appointment_confirmations
  );
  const status = Boolean(
    row.statusUpdates !== undefined ? row.statusUpdates : row.status_updates
  );
  const cancel = Boolean(
    row.cancellationAlerts !== undefined
      ? row.cancellationAlerts
      : row.cancellation_alerts
  );

  return {
    appointmentConfirmations: appt,
    appointment_confirmations: appt,
    statusUpdates: status,
    status_updates: status,
    cancellationAlerts: cancel,
    cancellation_alerts: cancel,
    updatedAt: row.updated_at || row.updatedAt,
    updated_at: row.updated_at || row.updatedAt,
  };
}

export const userRepository = {
  /**
   * Finds a safe user by unique ID.
   * @param {string} id User ID
   * @param {object} [options]
   * @param {boolean} [options.includePreferences=true]
   * @returns {Promise<object|null>} Safe user object or null
   */
  async findById(id, { includePreferences = true } = {}) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, user_type, avatar_color, created_at, updated_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) return null;

    let preferences = null;
    if (includePreferences) {
      preferences = await this.getPreferences(id);
    }

    return formatSafeUser(rows[0], preferences);
  },

  /**
   * Finds an internal user record by email, including password_hash for authentication.
   * Case-insensitive matching.
   * @param {string} email
   * @returns {Promise<object|null>} Raw database row with password_hash or null
   */
  async findByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, phone, user_type, avatar_color, created_at, updated_at, password_updated_at
       FROM users
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [normalized]
    );

    return rows.length ? rows[0] : null;
  },

  /**
   * Checks whether an account exists with the specified email (case-insensitive).
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async existsByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT 1 FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [normalized]
    );

    return rows.length > 0;
  },

  /**
   * Atomically creates a new customer user and their initial preferences record.
   * @param {object} data
   * @param {string} data.name
   * @param {string} data.email
   * @param {string} data.passwordHash
   * @param {string} [data.phone]
   * @param {string} [data.userType='Individual Resident']
   * @param {string} [data.avatarColor='bg-[#FF7028]']
   * @param {string} [data.id]
   * @returns {Promise<object>} Created safe user object
   */
  async create({
    name,
    email,
    passwordHash,
    phone = null,
    userType = 'Individual Resident',
    avatarColor = 'bg-[#FF7028]',
    id = null,
  }) {
    const pool = getPool();
    const connection = await pool.getConnection();

    const normalizedEmail = normalizeEmail(email);
    const userId = id || `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    try {
      await connection.beginTransaction();

      // 1. Insert into users
      await connection.query(
        `INSERT INTO users (id, name, email, password_hash, phone, user_type, avatar_color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          name.trim(),
          normalizedEmail,
          passwordHash,
          phone ? phone.trim() : null,
          userType || 'Individual Resident',
          avatarColor || 'bg-[#FF7028]',
        ]
      );

      // 2. Insert default preferences
      await connection.query(
        `INSERT INTO user_preferences (user_id, appointment_confirmations, status_updates, cancellation_alerts)
         VALUES (?, TRUE, TRUE, TRUE)`,
        [userId]
      );

      await connection.commit();

      return {
        id: userId,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        userType: userType || 'Individual Resident',
        user_type: userType || 'Individual Resident',
        avatarColor: avatarColor || 'bg-[#FF7028]',
        avatar_color: avatarColor || 'bg-[#FF7028]',
        preferences: {
          appointmentConfirmations: true,
          statusUpdates: true,
          cancellationAlerts: true,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Updates customer profile fields (name, phone, avatarColor, userType).
   * Never mutates id, email, or password_hash.
   * @param {string} userId
   * @param {object} fields
   * @returns {Promise<object>} Safe updated user profile
   */
  async updateProfile(userId, { name, phone, avatarColor, userType }) {
    const pool = getPool();
    const updates = [];
    const params = [];

    if (name !== undefined && typeof name === 'string') {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone && typeof phone === 'string' ? phone.trim() : null);
    }
    if (avatarColor !== undefined && typeof avatarColor === 'string') {
      updates.push('avatar_color = ?');
      params.push(avatarColor.trim());
    }
    if (userType !== undefined && typeof userType === 'string') {
      updates.push('user_type = ?');
      params.push(userType.trim());
    }

    if (updates.length > 0) {
      params.push(userId);
      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    return this.findById(userId);
  },

  /**
   * Retrieves the current password hash for a user by their unique ID.
   * @param {string} userId
   * @returns {Promise<string|null>}
   */
  async getPasswordHash(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT password_hash FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    return rows.length ? rows[0].password_hash : null;
  },

  /**
   * Updates the password hash and sets password_updated_at timestamp.
   * @param {string} userId
   * @param {string} passwordHash
   * @returns {Promise<boolean>}
   */
  async updatePassword(userId, passwordHash) {
    const pool = getPool();
    const [result] = await pool.query(
      `UPDATE users
       SET password_hash = ?, password_updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [passwordHash, userId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Retrieves preferences for a user in camelCase format.
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async getPreferences(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT appointment_confirmations, status_updates, cancellation_alerts, updated_at
       FROM user_preferences
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    return rows.length ? formatPreferences(rows[0]) : null;
  },

  /**
   * Updates notification preferences in user_preferences.
   * @param {string} userId
   * @param {object} prefs
   * @returns {Promise<object>}
   */
  async updatePreferences(userId, prefs = {}) {
    const pool = getPool();
    const updates = [];
    const params = [];

    if (prefs.appointmentConfirmations !== undefined) {
      updates.push('appointment_confirmations = ?');
      params.push(Boolean(prefs.appointmentConfirmations));
    }
    if (prefs.statusUpdates !== undefined) {
      updates.push('status_updates = ?');
      params.push(Boolean(prefs.statusUpdates));
    }
    if (prefs.cancellationAlerts !== undefined) {
      updates.push('cancellation_alerts = ?');
      params.push(Boolean(prefs.cancellationAlerts));
    }

    if (updates.length > 0) {
      params.push(userId);
      await pool.query(
        `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
        params
      );
    }

    return this.getPreferences(userId);
  },

  /**
   * Deletes a user by ID (for test cleanup and account deletion).
   * Cascades to preferences and addresses via foreign keys.
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },

  /**
   * Deletes test users matching a pattern (for test fixture cleanup).
   * @param {string} emailPrefix
   * @returns {Promise<number>}
   */
  async deleteByEmailPrefix(emailPrefix) {
    const pool = getPool();
    const [result] = await pool.query(
      `DELETE FROM users WHERE email LIKE ?`,
      [`${emailPrefix}%`]
    );
    return result.affectedRows;
  },
};

export default userRepository;
