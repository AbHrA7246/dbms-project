import { getPool } from '../config/db.js';

export const STATUS_STEP_MAP = {
  'Submitted': 0,
  'Accepted': 0,
  'Schedule Proposed': 0,
  'Scheduled': 1,
  'Confirmed': 1,
  'In Transit': 1,
  'Reschedule Requested': 1,
  'Received': 2,
  'Drop-off Completed': 2,
  'Processing': 2,
  'Completed': 2,
  'Recycled': 2,
  'Rejected': -1,
  'Cancelled': -1,
};

/**
 * Transforms a raw database collection_requests row into a safe, client-facing request object.
 * @param {object} row
 * @returns {object|null}
 */
export function formatSafeRequest(row) {
  if (!row) return null;

  const lat = row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : null;
  const lng = row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : null;
  const declaredWt = Number(row.declared_weight_kg);
  const qty = Number(row.quantity);

  return {
    id: row.id,
    userId: row.user_id,
    user_id: row.user_id,
    userEmail: row.user_email,
    user_email: row.user_email,
    customerName: row.customer_name,
    customer_name: row.customer_name,
    customerPhone: row.customer_phone || '',
    customer_phone: row.customer_phone || '',
    centreId: row.centre_id,
    centre_id: row.centre_id,
    centreName: row.centre_name,
    centre_name: row.centre_name,
    center: row.centre_name,
    category: row.category,
    brand: row.brand,
    model: row.model,
    items: row.items,
    conditionState: row.condition_state,
    condition_state: row.condition_state,
    condition: row.condition_state,
    quantity: qty,
    itemCount: qty,
    declaredWeightKg: declaredWt,
    declared_weight_kg: declaredWt,
    weight: declaredWt,
    receivedWeightKg: row.received_weight_kg !== null ? Number(row.received_weight_kg) : null,
    received_weight_kg: row.received_weight_kg !== null ? Number(row.received_weight_kg) : null,
    weightDiscrepancyKg: row.weight_discrepancy_kg !== null ? Number(row.weight_discrepancy_kg) : null,
    weight_discrepancy_kg: row.weight_discrepancy_kg !== null ? Number(row.weight_discrepancy_kg) : null,
    method: row.method,
    channel: row.channel,
    pickupAddress: row.pickup_address,
    pickup_address: row.pickup_address,
    address: row.method === 'pickup' ? row.pickup_address : row.dropoff_facility_address,
    dropoffFacilityAddress: row.dropoff_facility_address || '',
    dropoff_facility_address: row.dropoff_facility_address || '',
    dropoffFacilityCity: row.dropoff_facility_city || '',
    dropoff_facility_city: row.dropoff_facility_city || '',
    dropoffFacilityHours: row.dropoff_facility_hours || '',
    dropoff_facility_hours: row.dropoff_facility_hours || '',
    latitude: lat,
    longitude: lng,
    coordinates: lat !== null && lng !== null ? { lat, lng } : null,
    preferredSlot: row.preferred_slot || '',
    preferred_slot: row.preferred_slot || '',
    notes: row.notes || '',
    status: row.status,
    currentStep: row.current_step,
    current_step: row.current_step,
    rejectionReason: row.rejection_reason || null,
    rejection_reason: row.rejection_reason || null,
    cancellationReason: row.cancellation_reason || null,
    cancellation_reason: row.cancellation_reason || null,
    cancelledAt: row.cancelled_at || null,
    cancelled_at: row.cancelled_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Transforms a raw database request_history row into a safe, client-facing history entry.
 * @param {object} row
 * @returns {object|null}
 */
export function formatSafeHistory(row) {
  if (!row) return null;
  return {
    id: row.id,
    requestId: row.request_id,
    request_id: row.request_id,
    eventTime: row.event_time,
    event_time: row.event_time,
    time: row.event_time_formatted,
    eventTimeFormatted: row.event_time_formatted,
    event_time_formatted: row.event_time_formatted,
    eventDescription: row.event_description,
    event_description: row.event_description,
    event: row.event_description,
    actor: row.actor,
  };
}

export const requestRepository = {
  /**
   * Atomically creates a collection request and its initial request_history record.
   * If either insert fails, both are rolled back.
   * @param {object} reqData
   * @param {object} initialHistory
   * @returns {Promise<object>} Safe created request
   */
  async create(reqData, initialHistory) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Insert into collection_requests
      await connection.query(
        `INSERT INTO collection_requests (
          id, user_id, user_email, customer_name, customer_phone,
          centre_id, centre_name, category, brand, model, items,
          condition_state, quantity, declared_weight_kg, method, channel,
          pickup_address, dropoff_facility_address, dropoff_facility_city, dropoff_facility_hours,
          latitude, longitude, preferred_slot, notes, status, current_step
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reqData.id,
          reqData.userId || null,
          reqData.userEmail,
          reqData.customerName,
          reqData.customerPhone || null,
          reqData.centreId || null,
          reqData.centreName,
          reqData.category,
          reqData.brand,
          reqData.model,
          reqData.items,
          reqData.conditionState || 'working',
          reqData.quantity,
          reqData.declaredWeightKg,
          reqData.method || 'dropoff',
          reqData.channel || (reqData.method === 'pickup' ? 'Doorstep Pickup' : 'Center Drop-off'),
          reqData.pickupAddress || null,
          reqData.dropoffFacilityAddress || null,
          reqData.dropoffFacilityCity || null,
          reqData.dropoffFacilityHours || null,
          reqData.latitude !== undefined ? reqData.latitude : null,
          reqData.longitude !== undefined ? reqData.longitude : null,
          reqData.preferredSlot || null,
          reqData.notes || null,
          reqData.status || 'Submitted',
          reqData.currentStep !== undefined ? reqData.currentStep : 0,
        ]
      );

      // 2. Insert into request_history
      await connection.query(
        `INSERT INTO request_history (
          request_id, event_time_formatted, event_description, actor
        ) VALUES (?, ?, ?, ?)`,
        [
          reqData.id,
          initialHistory.eventTimeFormatted || null,
          initialHistory.eventDescription,
          initialHistory.actor || 'Customer',
        ]
      );

      await connection.commit();

      const [rows] = await pool.query(
        `SELECT * FROM collection_requests WHERE id = ? LIMIT 1`,
        [reqData.id]
      );

      return formatSafeRequest(rows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Retrieves a single collection request by ID.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async findById(id) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT * FROM collection_requests WHERE id = ? LIMIT 1`,
      [id]
    );

    return rows.length ? formatSafeRequest(rows[0]) : null;
  },

  /**
   * Lists requests for an authenticated customer with pagination and filters.
   * @param {string} customerId
   * @param {string} customerEmail
   * @param {object} options
   * @returns {Promise<{ requests: Array<object>, pagination: object }>}
   */
  async findByCustomerId(customerId, customerEmail, {
    status = '',
    category = '',
    method = '',
    page = 1,
    limit = 10,
  } = {}) {
    const pool = getPool();

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (safePage - 1) * safeLimit;

    const whereClauses = ['(user_id = ? OR LOWER(user_email) = LOWER(?))'];
    const params = [customerId, customerEmail];

    if (status && typeof status === 'string' && status.trim()) {
      whereClauses.push('status = ?');
      params.push(status.trim());
    }

    if (category && typeof category === 'string' && category.trim()) {
      whereClauses.push('category = ?');
      params.push(category.trim());
    }

    if (method && typeof method === 'string' && method.trim()) {
      whereClauses.push('method = ?');
      params.push(method.trim().toLowerCase());
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Total count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM collection_requests ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    if (total === 0) {
      return {
        requests: [],
        pagination: {
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 0,
        },
      };
    }

    // Data query
    const queryParams = [...params, safeLimit, offset];
    const [rows] = await pool.query(
      `SELECT * FROM collection_requests
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return {
      requests: rows.map(formatSafeRequest),
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
      },
    };
  },

  /**
   * Lists requests assigned to an authenticated facility with pagination and filters.
   * @param {string} centreId
   * @param {object} options
   * @returns {Promise<{ requests: Array<object>, pagination: object }>}
   */
  async findByCentreId(centreId, {
    status = '',
    category = '',
    method = '',
    page = 1,
    limit = 10,
  } = {}) {
    const pool = getPool();

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (safePage - 1) * safeLimit;

    const whereClauses = ['centre_id = ?'];
    const params = [centreId];

    if (status && typeof status === 'string' && status.trim()) {
      whereClauses.push('status = ?');
      params.push(status.trim());
    }

    if (category && typeof category === 'string' && category.trim()) {
      whereClauses.push('category = ?');
      params.push(category.trim());
    }

    if (method && typeof method === 'string' && method.trim()) {
      whereClauses.push('method = ?');
      params.push(method.trim().toLowerCase());
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM collection_requests ${whereSql}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / safeLimit) || 1;

    if (total === 0) {
      return {
        requests: [],
        pagination: {
          total: 0,
          page: safePage,
          limit: safeLimit,
          totalPages: 0,
        },
      };
    }

    const queryParams = [...params, safeLimit, offset];
    const [rows] = await pool.query(
      `SELECT * FROM collection_requests
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return {
      requests: rows.map(formatSafeRequest),
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
      },
    };
  },

  /**
   * Retrieves the immutable history log for a specific request in chronological order.
   * @param {string} requestId
   * @returns {Promise<Array<object>>}
   */
  async getHistoryByRequestId(requestId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, request_id, event_time, event_time_formatted, event_description, actor
       FROM request_history
       WHERE request_id = ?
       ORDER BY event_time ASC, id ASC`,
      [requestId]
    );

    return rows.map(formatSafeHistory);
  },

  /**
   * Atomically transitions a request's status and logs a corresponding event to request_history.
   * @param {string} requestId
   * @param {string} newStatus
   * @param {number} currentStep
   * @param {'Customer'|'Centre Staff'|'System'} actor
   * @param {string} eventDescription
   * @param {object} [extraUpdates={}]
   * @returns {Promise<object>} Updated request
   */
  async updateStatusWithHistory(requestId, newStatus, currentStep, actor, eventDescription, extraUpdates = {}) {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Build updates
      const colUpdates = ['status = ?', 'current_step = ?'];
      const params = [newStatus, currentStep];

      if (extraUpdates.rejectionReason !== undefined) {
        colUpdates.push('rejection_reason = ?');
        params.push(extraUpdates.rejectionReason);
      }
      if (extraUpdates.cancellationReason !== undefined) {
        colUpdates.push('cancellation_reason = ?', 'cancelled_at = CURRENT_TIMESTAMP');
        params.push(extraUpdates.cancellationReason);
      }
      if (extraUpdates.receivedWeightKg !== undefined) {
        colUpdates.push('received_weight_kg = ?');
        params.push(extraUpdates.receivedWeightKg);
      }
      if (extraUpdates.weightDiscrepancyKg !== undefined) {
        colUpdates.push('weight_discrepancy_kg = ?');
        params.push(extraUpdates.weightDiscrepancyKg);
      }

      params.push(requestId);
      await connection.query(
        `UPDATE collection_requests SET ${colUpdates.join(', ')} WHERE id = ?`,
        params
      );

      // 2. Insert into request_history
      const dateFormatted = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeFormatted = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const formattedTimestamp = `${dateFormatted}, ${timeFormatted}`;

      await connection.query(
        `INSERT INTO request_history (
          request_id, event_time_formatted, event_description, actor
        ) VALUES (?, ?, ?, ?)`,
        [requestId, formattedTimestamp, eventDescription, actor]
      );

      await connection.commit();

      const [rows] = await pool.query(
        `SELECT * FROM collection_requests WHERE id = ? LIMIT 1`,
        [requestId]
      );

      return formatSafeRequest(rows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Deletes a request by ID (cascades to request_history via foreign key).
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    const pool = getPool();
    const [result] = await pool.query(`DELETE FROM collection_requests WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },

  /**
   * Deletes test requests matching an ID prefix.
   * @param {string} prefix
   * @returns {Promise<number>}
   */
  async deleteByIdPrefix(prefix) {
    const pool = getPool();
    const [result] = await pool.query(`DELETE FROM collection_requests WHERE id LIKE ?`, [`${prefix}%`]);
    return result.affectedRows;
  },
};

export default requestRepository;
