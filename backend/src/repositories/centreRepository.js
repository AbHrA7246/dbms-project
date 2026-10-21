import crypto from 'node:crypto';
import { getPool } from '../config/db.js';
import { normalizeEmail } from '../utils/security.js';

export const VALID_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Transforms a raw database recycling centre row and associated relations
 * into a safe, client-facing profile without password hashes.
 * @param {object} row Raw database row from `recycling_centres`
 * @param {string[]} [operatingDays=[]]
 * @param {string[]} [categories=[]]
 * @returns {object} Safe centre profile
 */
export function formatSafeCentre(row, operatingDays = [], categories = []) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    serviceArea: row.service_area,
    service_area: row.service_area,
    capabilities: row.capabilities || '',
    maxWeeklyCapacityKg: Number(row.max_weekly_capacity_kg),
    max_weekly_capacity_kg: Number(row.max_weekly_capacity_kg),
    maxWeeklyUnits: Number(row.max_weekly_units),
    max_weekly_units: Number(row.max_weekly_units),
    slotLimitKg: Number(row.slot_limit_kg),
    slot_limit_kg: Number(row.slot_limit_kg),
    leadTimeDays: Number(row.lead_time_days),
    lead_time_days: Number(row.lead_time_days),
    pickupAvailable: Boolean(row.pickup_available),
    pickup_available: Boolean(row.pickup_available),
    dropoffAvailable: Boolean(row.dropoff_available),
    dropoff_available: Boolean(row.dropoff_available),
    openingTime: row.opening_time,
    opening_time: row.opening_time,
    closingTime: row.closing_time,
    closing_time: row.closing_time,
    operatingDaysSummary: row.operating_days_summary,
    operating_days_summary: row.operating_days_summary,
    operatingHoursSummary: row.operating_hours_summary,
    operating_hours_summary: row.operating_hours_summary,
    latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null,
    longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null,
    staffName: row.staff_name,
    staff_name: row.staff_name,
    staffRole: row.staff_role,
    staff_role: row.staff_role,
    operatingDaysList: operatingDays,
    operating_days: operatingDays,
    categories: categories,
    accepted_categories: categories,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Transforms a raw database recycling centre row into a public profile.
 * Strictly excludes password hashes, password timestamps, staff names/roles,
 * and internal operational limits.
 * @param {object} row Raw database row from `recycling_centres`
 * @param {string[]} [operatingDays=[]]
 * @param {string[]} [categories=[]]
 * @returns {object} Public centre profile
 */
export function formatPublicCentre(row, operatingDays = [], categories = []) {
  if (!row) return null;

  const lat = row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null;
  const lng = row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    serviceArea: row.service_area,
    service_area: row.service_area,
    capabilities: row.capabilities || '',
    pickupAvailable: Boolean(row.pickup_available),
    pickup_available: Boolean(row.pickup_available),
    dropoffAvailable: Boolean(row.dropoff_available),
    dropoff_available: Boolean(row.dropoff_available),
    openingTime: row.opening_time,
    opening_time: row.opening_time,
    closingTime: row.closing_time,
    closing_time: row.closing_time,
    operatingDaysSummary: row.operating_days_summary,
    operating_days_summary: row.operating_days_summary,
    operatingHoursSummary: row.operating_hours_summary,
    operating_hours_summary: row.operating_hours_summary,
    latitude: lat,
    longitude: lng,
    coordinates: lat !== null && lng !== null ? { lat, lng } : null,
    operatingDaysList: operatingDays,
    operating_days: operatingDays,
    categories: categories,
    accepted_categories: categories,
    slotLimitKg: Number(row.slot_limit_kg),
    slot_limit_kg: Number(row.slot_limit_kg),
    leadTimeDays: Number(row.lead_time_days),
    lead_time_days: Number(row.lead_time_days),
    createdAt: row.created_at,
  };
}

/**
 * Calculates operational capacity limits for facility management.
 * @param {object} centre
 * @returns {object}
 */
export function calculateCapacityLimits(centre) {
  if (!centre) return null;
  const activeDays = centre.operatingDaysList && centre.operatingDaysList.length > 0
    ? centre.operatingDaysList.length
    : 5;
  const maxWeeklyKg = Number(centre.maxWeeklyCapacityKg) || 3000;
  const maxWeeklyUnits = Number(centre.maxWeeklyUnits) || 800;
  const slotLimitKg = Number(centre.slotLimitKg) || 250;

  const dailyMaxKg = Math.ceil(maxWeeklyKg / activeDays);
  const dailyMaxUnits = Math.ceil(maxWeeklyUnits / activeDays);

  return {
    maxWeeklyCapacityKg: maxWeeklyKg,
    maxWeeklyUnits,
    slotLimitKg,
    leadTimeDays: Number(centre.leadTimeDays) || 2,
    activeDaysCount: activeDays,
    dailyMaxKg,
    dailyMaxUnits,
  };
}

export const centreRepository = {
  /**
   * Finds a safe recycling centre by unique ID, including operating days and categories.
   * @param {string} id Centre ID
   * @param {object} [options]
   * @param {boolean} [options.includeRelations=true]
   * @returns {Promise<object|null>} Safe centre object or null
   */
  async findById(id, { includeRelations = true } = {}) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, address, city, service_area, capabilities,
              max_weekly_capacity_kg, max_weekly_units, slot_limit_kg, lead_time_days,
              pickup_available, dropoff_available, opening_time, closing_time,
              operating_days_summary, operating_hours_summary, latitude, longitude,
              staff_name, staff_role, created_at, updated_at
       FROM recycling_centres
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) return null;

    let operatingDays = [];
    let categories = [];

    if (includeRelations) {
      const [daysRows] = await pool.query(
        `SELECT day_of_week
         FROM centre_operating_days
         WHERE centre_id = ?
         ORDER BY FIELD(day_of_week, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')`,
        [id]
      );
      operatingDays = daysRows.map((r) => r.day_of_week);

      const [catRows] = await pool.query(
        `SELECT category
         FROM centre_accepted_categories
         WHERE centre_id = ?
         ORDER BY category ASC`,
        [id]
      );
      categories = catRows.map((r) => r.category);
    }

    return formatSafeCentre(rows[0], operatingDays, categories);
  },

  /**
   * Finds a public recycling centre profile by unique ID.
   * @param {string} id Centre ID
   * @returns {Promise<object|null>} Public centre object or null
   */
  async findPublicById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, address, city, service_area, capabilities,
              pickup_available, dropoff_available, opening_time, closing_time,
              operating_days_summary, operating_hours_summary, latitude, longitude,
              slot_limit_kg, lead_time_days, created_at
       FROM recycling_centres
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!rows.length) return null;

    const [daysRows] = await pool.query(
      `SELECT day_of_week
       FROM centre_operating_days
       WHERE centre_id = ?
       ORDER BY FIELD(day_of_week, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')`,
      [id]
    );
    const operatingDays = daysRows.map((r) => r.day_of_week);

    const [catRows] = await pool.query(
      `SELECT category
       FROM centre_accepted_categories
       WHERE centre_id = ?
       ORDER BY category ASC`,
      [id]
    );
    const categories = catRows.map((r) => r.category);

    return formatPublicCentre(rows[0], operatingDays, categories);
  },

  /**
   * Lists public registered recycling centres with pagination and optional search/filter parameters.
   * @param {object} options
   * @returns {Promise<{ centres: Array<object>, pagination: object }>}
   */
  async findPublicAll({
    search = '',
    category = '',
    city = '',
    method = '',
    pickupAvailable,
    dropoffAvailable,
    page = 1,
    limit = 10,
  } = {}) {
    const pool = getPool();

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (safePage - 1) * safeLimit;

    const whereClauses = [];
    const params = [];

    if (search && typeof search === 'string' && search.trim()) {
      const s = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(
        `(LOWER(c.name) LIKE ? OR LOWER(c.city) LIKE ? OR LOWER(c.address) LIKE ? OR LOWER(c.service_area) LIKE ?)`
      );
      params.push(s, s, s, s);
    }

    if (city && typeof city === 'string' && city.trim()) {
      whereClauses.push(`LOWER(c.city) = LOWER(?)`);
      params.push(city.trim());
    }

    if (method && typeof method === 'string') {
      const m = method.trim().toLowerCase();
      if (m === 'pickup') {
        whereClauses.push(`c.pickup_available = TRUE`);
      } else if (m === 'dropoff') {
        whereClauses.push(`c.dropoff_available = TRUE`);
      }
    }

    if (pickupAvailable !== undefined) {
      whereClauses.push(`c.pickup_available = ?`);
      params.push(Boolean(pickupAvailable));
    }

    if (dropoffAvailable !== undefined) {
      whereClauses.push(`c.dropoff_available = ?`);
      params.push(Boolean(dropoffAvailable));
    }

    if (category && typeof category === 'string' && category.trim()) {
      whereClauses.push(
        `EXISTS (
          SELECT 1 FROM centre_accepted_categories cat
          WHERE cat.centre_id = c.id AND LOWER(cat.category) LIKE LOWER(?)
        )`
      );
      params.push(`%${category.trim()}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // 1. Total count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM recycling_centres c ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    if (total === 0) {
      return {
        centres: [],
        pagination: {
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 0,
        },
      };
    }

    // 2. Data query
    const queryParams = [...params, safeLimit, offset];
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone, c.address, c.city, c.service_area,
              c.capabilities, c.pickup_available, c.dropoff_available,
              c.opening_time, c.closing_time, c.operating_days_summary, c.operating_hours_summary,
              c.latitude, c.longitude, c.slot_limit_kg, c.lead_time_days, c.created_at
       FROM recycling_centres c
       ${whereSql}
       ORDER BY c.name ASC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    const centreIds = rows.map((r) => r.id);
    const daysMap = new Map();
    const catsMap = new Map();

    if (centreIds.length > 0) {
      const placeholders = centreIds.map(() => '?').join(', ');

      const [daysRows] = await pool.query(
        `SELECT centre_id, day_of_week
         FROM centre_operating_days
         WHERE centre_id IN (${placeholders})
         ORDER BY FIELD(day_of_week, 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun')`,
        centreIds
      );
      for (const d of daysRows) {
        if (!daysMap.has(d.centre_id)) daysMap.set(d.centre_id, []);
        daysMap.get(d.centre_id).push(d.day_of_week);
      }

      const [catRows] = await pool.query(
        `SELECT centre_id, category
         FROM centre_accepted_categories
         WHERE centre_id IN (${placeholders})
         ORDER BY category ASC`,
        centreIds
      );
      for (const cat of catRows) {
        if (!catsMap.has(cat.centre_id)) catsMap.set(cat.centre_id, []);
        catsMap.get(cat.centre_id).push(cat.category);
      }
    }

    const centres = rows.map((row) =>
      formatPublicCentre(row, daysMap.get(row.id) || [], catsMap.get(row.id) || [])
    );

    return {
      centres,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
      },
    };
  },

  /**
   * Finds an internal centre record by email, including password_hash for authentication.
   * Case-insensitive matching.
   * @param {string} email
   * @returns {Promise<object|null>} Raw database row with password_hash or null
   */
  async findByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, phone, address, city, service_area, capabilities,
              max_weekly_capacity_kg, max_weekly_units, slot_limit_kg, lead_time_days,
              pickup_available, dropoff_available, opening_time, closing_time,
              operating_days_summary, operating_hours_summary, latitude, longitude,
              staff_name, staff_role, created_at, updated_at
       FROM recycling_centres
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [normalized]
    );

    return rows.length ? rows[0] : null;
  },

  /**
   * Finds an internal centre record by either email or unique centre ID.
   * @param {string} identifier
   * @returns {Promise<object|null>}
   */
  async findByEmailOrId(identifier) {
    if (!identifier || typeof identifier !== 'string') return null;
    const trimmed = identifier.trim();

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, name, email, password_hash, phone, address, city, service_area, capabilities,
              max_weekly_capacity_kg, max_weekly_units, slot_limit_kg, lead_time_days,
              pickup_available, dropoff_available, opening_time, closing_time,
              operating_days_summary, operating_hours_summary, latitude, longitude,
              staff_name, staff_role, created_at, updated_at
       FROM recycling_centres
       WHERE id = ? OR LOWER(email) = LOWER(?)
       LIMIT 1`,
      [trimmed, trimmed]
    );

    return rows.length ? rows[0] : null;
  },

  /**
   * Checks whether a centre exists with the specified email (case-insensitive).
   * @param {string} email
   * @returns {Promise<boolean>}
   */
  async existsByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;

    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT 1 FROM recycling_centres WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [normalized]
    );

    return rows.length > 0;
  },

  /**
   * Atomically registers a recycling facility with operating days and accepted categories.
   * @param {object} centreData
   * @param {string[]} [operatingDays=['Mon','Tue','Wed','Thu','Fri']]
   * @param {string[]} [categories=[]]
   * @returns {Promise<object>} Created safe centre profile
   */
  async create(centreData, operatingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], categories = []) {
    const pool = getPool();
    const connection = await pool.getConnection();

    const normalizedEmail = normalizeEmail(centreData.email);
    const centreId = centreData.id || `CTR-${Date.now().toString().slice(-4)}${crypto.randomInt(100, 999)}`;

    // Validate operating days and sort by weekday sequence
    const validDays = [...new Set(operatingDays.filter((d) => VALID_DAYS.includes(d)))].sort(
      (a, b) => VALID_DAYS.indexOf(a) - VALID_DAYS.indexOf(b)
    );
    if (validDays.length === 0) {
      throw new Error('At least one valid operating day (Mon-Sun) is required.');
    }

    try {
      await connection.beginTransaction();

      // 1. Insert into recycling_centres
      await connection.query(
        `INSERT INTO recycling_centres (
          id, name, email, password_hash, phone, address, city, service_area, capabilities,
          max_weekly_capacity_kg, max_weekly_units, slot_limit_kg, lead_time_days,
          pickup_available, dropoff_available, opening_time, closing_time,
          operating_days_summary, operating_hours_summary, latitude, longitude,
          staff_name, staff_role
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          centreId,
          centreData.name.trim(),
          normalizedEmail,
          centreData.passwordHash,
          centreData.phone.trim(),
          centreData.address.trim(),
          centreData.city.trim(),
          (centreData.serviceArea || centreData.city).trim(),
          centreData.capabilities || null,
          centreData.maxWeeklyCapacityKg !== undefined ? Number(centreData.maxWeeklyCapacityKg) : 3000.0,
          centreData.maxWeeklyUnits !== undefined ? Number(centreData.maxWeeklyUnits) : 800,
          centreData.slotLimitKg !== undefined ? Number(centreData.slotLimitKg) : 250.0,
          centreData.leadTimeDays !== undefined ? Number(centreData.leadTimeDays) : 2,
          centreData.pickupAvailable !== undefined ? Boolean(centreData.pickupAvailable) : true,
          centreData.dropoffAvailable !== undefined ? Boolean(centreData.dropoffAvailable) : true,
          centreData.openingTime || '09:00',
          centreData.closingTime || '17:00',
          centreData.operatingDaysSummary || 'Monday to Friday',
          centreData.operatingHoursSummary || '09:00 AM – 05:00 PM',
          centreData.latitude !== undefined && centreData.latitude !== null ? Number(centreData.latitude) : null,
          centreData.longitude !== undefined && centreData.longitude !== null ? Number(centreData.longitude) : null,
          centreData.staffName ? centreData.staffName.trim() : 'Facility Operations Lead',
          centreData.staffRole ? centreData.staffRole.trim() : 'Operations Lead',
        ]
      );

      // 2. Insert into centre_operating_days
      for (const day of validDays) {
        await connection.query(
          `INSERT INTO centre_operating_days (centre_id, day_of_week) VALUES (?, ?)`,
          [centreId, day]
        );
      }

      // 3. Insert into centre_accepted_categories
      const uniqueCategories = [...new Set(categories.map((c) => (typeof c === 'string' ? c.trim() : '')).filter(Boolean))].sort();
      for (const cat of uniqueCategories) {
        await connection.query(
          `INSERT INTO centre_accepted_categories (centre_id, category) VALUES (?, ?)`,
          [centreId, cat]
        );
      }

      await connection.commit();

      return formatSafeCentre(
        {
          id: centreId,
          name: centreData.name.trim(),
          email: normalizedEmail,
          phone: centreData.phone.trim(),
          address: centreData.address.trim(),
          city: centreData.city.trim(),
          service_area: (centreData.serviceArea || centreData.city).trim(),
          capabilities: centreData.capabilities || '',
          max_weekly_capacity_kg: centreData.maxWeeklyCapacityKg !== undefined ? Number(centreData.maxWeeklyCapacityKg) : 3000.0,
          max_weekly_units: centreData.maxWeeklyUnits !== undefined ? Number(centreData.maxWeeklyUnits) : 800,
          slot_limit_kg: centreData.slotLimitKg !== undefined ? Number(centreData.slotLimitKg) : 250.0,
          lead_time_days: centreData.leadTimeDays !== undefined ? Number(centreData.leadTimeDays) : 2,
          pickup_available: centreData.pickupAvailable !== undefined ? Boolean(centreData.pickupAvailable) : true,
          dropoff_available: centreData.dropoffAvailable !== undefined ? Boolean(centreData.dropoffAvailable) : true,
          opening_time: centreData.openingTime || '09:00',
          closing_time: centreData.closingTime || '17:00',
          operating_days_summary: centreData.operatingDaysSummary || 'Monday to Friday',
          operating_hours_summary: centreData.operatingHoursSummary || '09:00 AM – 05:00 PM',
          latitude: centreData.latitude !== undefined && centreData.latitude !== null ? Number(centreData.latitude) : null,
          longitude: centreData.longitude !== undefined && centreData.longitude !== null ? Number(centreData.longitude) : null,
          staff_name: centreData.staffName ? centreData.staffName.trim() : 'Facility Operations Lead',
          staff_role: centreData.staffRole ? centreData.staffRole.trim() : 'Operations Lead',
          created_at: new Date(),
          updated_at: new Date(),
        },
        validDays,
        uniqueCategories
      );
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Atomically updates a recycling facility's profile, schedule, and waste categories.
   * @param {string} centreId
   * @param {object} updates
   * @returns {Promise<object|null>} Updated safe centre profile
   */
  async updateProfile(centreId, updates = {}) {
    const existing = await this.findById(centreId);
    if (!existing) return null;

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Operating days update if provided
      if (updates.operatingDaysList !== undefined) {
        if (!Array.isArray(updates.operatingDaysList) || updates.operatingDaysList.length === 0) {
          throw new Error('At least one valid operating day (Mon-Sun) is required.');
        }
        const validDays = [...new Set(updates.operatingDaysList.filter((d) => VALID_DAYS.includes(d)))].sort(
          (a, b) => VALID_DAYS.indexOf(a) - VALID_DAYS.indexOf(b)
        );
        if (validDays.length === 0) {
          throw new Error('At least one valid operating day (Mon-Sun) is required.');
        }

        await connection.query(`DELETE FROM centre_operating_days WHERE centre_id = ?`, [centreId]);
        for (const day of validDays) {
          await connection.query(
            `INSERT INTO centre_operating_days (centre_id, day_of_week) VALUES (?, ?)`,
            [centreId, day]
          );
        }
      }

      // 2. Accepted categories update if provided
      if (updates.categories !== undefined) {
        if (!Array.isArray(updates.categories) || updates.categories.length === 0) {
          throw new Error('A facility must accept at least one e-waste category stream.');
        }
        const uniqueCategories = [
          ...new Set(updates.categories.map((c) => (typeof c === 'string' ? c.trim() : '')).filter(Boolean)),
        ].sort();
        if (uniqueCategories.length === 0) {
          throw new Error('A facility must accept at least one e-waste category stream.');
        }

        await connection.query(`DELETE FROM centre_accepted_categories WHERE centre_id = ?`, [centreId]);
        for (const cat of uniqueCategories) {
          await connection.query(
            `INSERT INTO centre_accepted_categories (centre_id, category) VALUES (?, ?)`,
            [centreId, cat]
          );
        }
      }

      // 3. Update recycling_centres table columns
      const colUpdates = [];
      const params = [];

      if (updates.name !== undefined && typeof updates.name === 'string') {
        colUpdates.push('name = ?');
        params.push(updates.name.trim());
      }
      if (updates.phone !== undefined && typeof updates.phone === 'string') {
        colUpdates.push('phone = ?');
        params.push(updates.phone.trim());
      }
      if (updates.address !== undefined && typeof updates.address === 'string') {
        colUpdates.push('address = ?');
        params.push(updates.address.trim());
      }
      if (updates.city !== undefined && typeof updates.city === 'string') {
        colUpdates.push('city = ?');
        params.push(updates.city.trim());
      }
      if (updates.serviceArea !== undefined || updates.service_area !== undefined) {
        colUpdates.push('service_area = ?');
        params.push((updates.serviceArea || updates.service_area).trim());
      }
      if (updates.capabilities !== undefined) {
        colUpdates.push('capabilities = ?');
        params.push(updates.capabilities ? updates.capabilities.trim() : null);
      }
      if (updates.staffName !== undefined || updates.staff_name !== undefined) {
        colUpdates.push('staff_name = ?');
        params.push((updates.staffName || updates.staff_name).trim());
      }
      if (updates.staffRole !== undefined || updates.staff_role !== undefined) {
        colUpdates.push('staff_role = ?');
        params.push((updates.staffRole || updates.staff_role).trim());
      }
      if (updates.pickupAvailable !== undefined || updates.pickup_available !== undefined) {
        colUpdates.push('pickup_available = ?');
        params.push(Boolean(updates.pickupAvailable ?? updates.pickup_available));
      }
      if (updates.dropoffAvailable !== undefined || updates.dropoff_available !== undefined) {
        colUpdates.push('dropoff_available = ?');
        params.push(Boolean(updates.dropoffAvailable ?? updates.dropoff_available));
      }
      if (updates.openingTime !== undefined || updates.opening_time !== undefined) {
        colUpdates.push('opening_time = ?');
        params.push(updates.openingTime || updates.opening_time);
      }
      if (updates.closingTime !== undefined || updates.closing_time !== undefined) {
        colUpdates.push('closing_time = ?');
        params.push(updates.closingTime || updates.closing_time);
      }
      if (updates.operatingDaysSummary !== undefined || updates.operating_days_summary !== undefined) {
        colUpdates.push('operating_days_summary = ?');
        params.push(updates.operatingDaysSummary || updates.operating_days_summary);
      }
      if (updates.operatingHoursSummary !== undefined || updates.operating_hours_summary !== undefined) {
        colUpdates.push('operating_hours_summary = ?');
        params.push(updates.operatingHoursSummary || updates.operating_hours_summary);
      }
      if (updates.maxWeeklyCapacityKg !== undefined || updates.max_weekly_capacity_kg !== undefined) {
        colUpdates.push('max_weekly_capacity_kg = ?');
        params.push(Number(updates.maxWeeklyCapacityKg ?? updates.max_weekly_capacity_kg));
      }
      if (updates.maxWeeklyUnits !== undefined || updates.max_weekly_units !== undefined) {
        colUpdates.push('max_weekly_units = ?');
        params.push(Number(updates.maxWeeklyUnits ?? updates.max_weekly_units));
      }
      if (updates.slotLimitKg !== undefined || updates.slot_limit_kg !== undefined) {
        colUpdates.push('slot_limit_kg = ?');
        params.push(Number(updates.slotLimitKg ?? updates.slot_limit_kg));
      }
      if (updates.leadTimeDays !== undefined || updates.lead_time_days !== undefined) {
        colUpdates.push('lead_time_days = ?');
        params.push(Number(updates.leadTimeDays ?? updates.lead_time_days));
      }

      // Coordinates
      if (updates.coordinates !== undefined) {
        if (updates.coordinates === null) {
          colUpdates.push('latitude = NULL, longitude = NULL');
        } else {
          colUpdates.push('latitude = ?, longitude = ?');
          params.push(Number(updates.coordinates.lat), Number(updates.coordinates.lng));
        }
      } else if (updates.latitude !== undefined || updates.longitude !== undefined) {
        colUpdates.push('latitude = ?, longitude = ?');
        params.push(
          updates.latitude !== null && updates.latitude !== undefined ? Number(updates.latitude) : null,
          updates.longitude !== null && updates.longitude !== undefined ? Number(updates.longitude) : null
        );
      }

      if (colUpdates.length > 0) {
        params.push(centreId);
        await connection.query(
          `UPDATE recycling_centres SET ${colUpdates.join(', ')} WHERE id = ?`,
          params
        );
      }

      await connection.commit();
      return this.findById(centreId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Deletes a centre by ID (cascades to child tables).
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query(`DELETE FROM recycling_centres WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },

  /**
   * Deletes test centres matching an email prefix.
   * @param {string} emailPrefix
   * @returns {Promise<number>}
   */
  async deleteByEmailPrefix(emailPrefix) {
    const pool = getPool();
    const [result] = await pool.query(
      `DELETE FROM recycling_centres WHERE email LIKE ?`,
      [`${emailPrefix}%`]
    );
    return result.affectedRows;
  },
};

export default centreRepository;
