import crypto from 'node:crypto';
import { getPool } from '../config/db.js';

export const UNRESOLVED_REQUEST_STATUSES = [
  'Submitted',
  'Accepted',
  'Schedule Proposed',
  'Scheduled',
  'Confirmed',
  'In Transit',
  'Reschedule Requested',
];

/**
 * Transforms a raw database user_addresses row into a safe, client-facing address object.
 * @param {object} row
 * @returns {object|null}
 */
export function formatSafeAddress(row) {
  if (!row) return null;

  const lat = row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null;
  const lng = row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null;

  return {
    id: row.id,
    userId: row.user_id,
    user_id: row.user_id,
    label: row.label || 'Home',
    addressLine: row.address_line,
    address_line: row.address_line,
    city: row.city,
    state: row.state || '',
    postalCode: row.postal_code || '',
    postal_code: row.postal_code || '',
    pickupInstructions: row.pickup_instructions || '',
    pickup_instructions: row.pickup_instructions || '',
    isDefault: Boolean(row.is_default),
    is_default: Boolean(row.is_default),
    latitude: lat,
    longitude: lng,
    coordinates: lat !== null && lng !== null ? { lat, lng } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const addressRepository = {
  /**
   * Retrieves all saved addresses for a given user, ordered with default first.
   * @param {string} userId
   * @returns {Promise<Array<object>>}
   */
  async findByUserId(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, user_id, label, address_line, city, state, postal_code,
              pickup_instructions, is_default, latitude, longitude, created_at, updated_at
       FROM user_addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return rows.map(formatSafeAddress);
  },

  /**
   * Retrieves a specific address by its ID, strictly scoped to the owner userId.
   * @param {string} id Address ID
   * @param {string} userId Authenticated Customer ID
   * @returns {Promise<object|null>}
   */
  async findByIdAndUserId(id, userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, user_id, label, address_line, city, state, postal_code,
              pickup_instructions, is_default, latitude, longitude, created_at, updated_at
       FROM user_addresses
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
      [id, userId]
    );

    return rows.length ? formatSafeAddress(rows[0]) : null;
  },

  /**
   * Returns count of saved addresses for a user.
   * @param {string} userId
   * @param {object} [connection] Optional active transaction connection
   * @returns {Promise<number>}
   */
  async countByUserId(userId, connection = null) {
    const executor = connection || getPool();
    const [rows] = await executor.query(
      `SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = ?`,
      [userId]
    );
    return Number(rows[0]?.total || 0);
  },

  /**
   * Checks whether an address is currently referenced by an active, unresolved collection request.
   * @param {string} addressId
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async isAddressAttachedToActiveRequest(addressId, userId) {
    const address = await this.findByIdAndUserId(addressId, userId);
    if (!address) return false;

    const pool = getPool();
    const placeholders = UNRESOLVED_REQUEST_STATUSES.map(() => '?').join(', ');
    const [requests] = await pool.query(
      `SELECT id, pickup_address
       FROM collection_requests
       WHERE user_id = ? AND status IN (${placeholders})`,
      [userId, ...UNRESOLVED_REQUEST_STATUSES]
    );

    if (requests.length === 0) return false;

    const targetLine = address.addressLine.trim().toLowerCase();
    for (const req of requests) {
      if (req.pickup_address && req.pickup_address.toLowerCase().includes(targetLine)) {
        return true;
      }
    }

    return false;
  },

  /**
   * Atomically creates a new address record.
   * If this is the user's first address, or isDefault is true, enforces single-default constraint.
   * @param {string} userId
   * @param {object} data
   * @returns {Promise<object>} Safe address profile
   */
  async create(userId, data) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const existingCount = await this.countByUserId(userId, connection);
      const isDefault = data.isDefault !== undefined ? Boolean(data.isDefault) : existingCount === 0;

      if (isDefault) {
        await connection.query(
          `UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?`,
          [userId]
        );
      }

      const addressId =
        data.id || `ADDR-${Date.now().toString().slice(-4)}${crypto.randomInt(100, 999)}`;

      const lat =
        data.latitude !== undefined && data.latitude !== null
          ? Number(data.latitude)
          : data.coordinates?.lat !== undefined && data.coordinates?.lat !== null
          ? Number(data.coordinates.lat)
          : null;

      const lng =
        data.longitude !== undefined && data.longitude !== null
          ? Number(data.longitude)
          : data.coordinates?.lng !== undefined && data.coordinates?.lng !== null
          ? Number(data.coordinates.lng)
          : null;

      await connection.query(
        `INSERT INTO user_addresses (
          id, user_id, label, address_line, city, state, postal_code,
          pickup_instructions, is_default, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          addressId,
          userId,
          data.label ? data.label.trim() : 'Home',
          data.addressLine.trim(),
          data.city.trim(),
          data.state ? data.state.trim() : null,
          data.postalCode ? data.postalCode.trim() : null,
          data.pickupInstructions ? data.pickupInstructions.trim() : null,
          isDefault,
          lat,
          lng,
        ]
      );

      await connection.commit();

      const [newRows] = await pool.query(
        `SELECT id, user_id, label, address_line, city, state, postal_code,
                pickup_instructions, is_default, latitude, longitude, created_at, updated_at
         FROM user_addresses
         WHERE id = ?
         LIMIT 1`,
        [addressId]
      );

      return formatSafeAddress(newRows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Atomically updates an existing address for a specific user.
   * @param {string} id
   * @param {string} userId
   * @param {object} data
   * @returns {Promise<object|null>} Updated address or null if not found
   */
  async update(id, userId, data) {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) return null;

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const shouldBeDefault = data.isDefault !== undefined ? Boolean(data.isDefault) : existing.isDefault;

      if (shouldBeDefault && !existing.isDefault) {
        await connection.query(
          `UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?`,
          [userId]
        );
      }

      const updates = [];
      const params = [];

      if (data.label !== undefined) {
        updates.push('label = ?');
        params.push(data.label ? data.label.trim() : 'Home');
      }
      if (data.addressLine !== undefined) {
        updates.push('address_line = ?');
        params.push(data.addressLine.trim());
      }
      if (data.city !== undefined) {
        updates.push('city = ?');
        params.push(data.city.trim());
      }
      if (data.state !== undefined) {
        updates.push('state = ?');
        params.push(data.state ? data.state.trim() : null);
      }
      if (data.postalCode !== undefined) {
        updates.push('postal_code = ?');
        params.push(data.postalCode ? data.postalCode.trim() : null);
      }
      if (data.pickupInstructions !== undefined) {
        updates.push('pickup_instructions = ?');
        params.push(data.pickupInstructions ? data.pickupInstructions.trim() : null);
      }
      if (data.isDefault !== undefined) {
        updates.push('is_default = ?');
        params.push(shouldBeDefault);
      }

      // Handle coordinates
      if (data.coordinates !== undefined) {
        if (data.coordinates === null) {
          updates.push('latitude = NULL, longitude = NULL');
        } else {
          updates.push('latitude = ?, longitude = ?');
          params.push(Number(data.coordinates.lat), Number(data.coordinates.lng));
        }
      } else if (data.latitude !== undefined || data.longitude !== undefined) {
        updates.push('latitude = ?, longitude = ?');
        params.push(
          data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
          data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null
        );
      }

      if (updates.length > 0) {
        params.push(id, userId);
        await connection.query(
          `UPDATE user_addresses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
          params
        );
      }

      await connection.commit();

      const [updatedRows] = await pool.query(
        `SELECT id, user_id, label, address_line, city, state, postal_code,
                pickup_instructions, is_default, latitude, longitude, created_at, updated_at
         FROM user_addresses
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
        [id, userId]
      );

      return formatSafeAddress(updatedRows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Sets the specified address as default, resetting any other default addresses for this user.
   * @param {string} id
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async setDefault(id, userId) {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) return null;

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?`,
        [userId]
      );

      await connection.query(
        `UPDATE user_addresses SET is_default = TRUE WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      await connection.commit();

      const [updatedRows] = await pool.query(
        `SELECT id, user_id, label, address_line, city, state, postal_code,
                pickup_instructions, is_default, latitude, longitude, created_at, updated_at
         FROM user_addresses
         WHERE id = ? AND user_id = ?
         LIMIT 1`,
        [id, userId]
      );

      return formatSafeAddress(updatedRows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Deletes an address for a specific user.
   * If the deleted address was default, automatically designates the most recent remaining address as default.
   * @param {string} id
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async delete(id, userId) {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) return false;

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(
        `DELETE FROM user_addresses WHERE id = ? AND user_id = ?`,
        [id, userId]
      );

      // If deleted address was default, promote the most recent remaining address to default
      if (existing.isDefault) {
        const [remaining] = await connection.query(
          `SELECT id FROM user_addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
          [userId]
        );

        if (remaining.length > 0) {
          await connection.query(
            `UPDATE user_addresses SET is_default = TRUE WHERE id = ? AND user_id = ?`,
            [remaining[0].id, userId]
          );
        }
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};

export default addressRepository;
