import crypto from 'node:crypto';
import requestRepository, { STATUS_STEP_MAP } from '../repositories/requestRepository.js';
import centreRepository from '../repositories/centreRepository.js';
import addressRepository from '../repositories/addressRepository.js';

export const VALID_METHODS = ['pickup', 'dropoff'];
export const VALID_CONDITIONS = ['working', 'repairable', 'faulty', 'parts_only'];

/**
 * Validates coordinate numbers and boundaries.
 * @param {number|null} lat
 * @param {number|null} lng
 * @returns {{ isValid: boolean, error?: string, lat?: number|null, lng?: number|null }}
 */
function validateCoordinates(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return { isValid: true, lat: null, lng: null };
  }
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
    return { isValid: false, error: 'Coordinates must be valid finite numbers.' };
  }
  if (numLat < -90 || numLat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90 degrees.' };
  }
  if (numLng < -180 || numLng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180 degrees.' };
  }
  return { isValid: true, lat: numLat, lng: numLng };
}

/**
 * Validates strictly positive integer quantities, rejecting strings like '12abc', 0, or negative.
 * @param {*} value
 * @returns {{ isValid: boolean, quantity?: number, error?: string }}
 */
function parseStrictQuantity(value) {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: 'Quantity is required.' };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      return { isValid: false, error: 'Quantity must be a positive whole integer.' };
    }
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) {
    return { isValid: false, error: 'Quantity must be a positive integer between 1 and 1,000 units.' };
  }
  return { isValid: true, quantity: parsed };
}

/**
 * Validates strictly positive finite weight, rejecting strings like '12abc', 0, or negative.
 * @param {*} value
 * @returns {{ isValid: boolean, weight?: number, error?: string }}
 */
function parseStrictWeight(value) {
  if (value === undefined || value === null || value === '') {
    return { isValid: false, error: 'Weight is required.' };
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      return { isValid: false, error: 'Weight must be a valid positive numeric value.' };
    }
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 5000) {
    return { isValid: false, error: 'Weight must be a positive number greater than 0 kg and up to 5,000 kg.' };
  }
  return { isValid: true, weight: Number(parsed.toFixed(2)) };
}

export const requestService = {
  /**
   * Validates and atomically creates an e-waste collection request for an authenticated customer.
   * @param {object} customer Authenticated customer (req.user)
   * @param {object} data Submission payload
   * @returns {Promise<object>} Created safe collection request
   */
  async createRequest(customer, data = {}) {
    if (!customer || !customer.id || !customer.email) {
      const err = new Error('Authentication required: customer identity missing.');
      err.status = 401;
      throw err;
    }

    // 1. Required text fields
    if (!data.category || typeof data.category !== 'string' || !data.category.trim()) {
      const err = new Error('E-waste category stream is required.');
      err.status = 400;
      throw err;
    }

    if (!data.brand || typeof data.brand !== 'string' || !data.brand.trim()) {
      const err = new Error('Device brand / manufacturer is required.');
      err.status = 400;
      throw err;
    }

    if (!data.model || typeof data.model !== 'string' || !data.model.trim()) {
      const err = new Error('Device model is required.');
      err.status = 400;
      throw err;
    }

    // 2. Strict quantity & weight
    const rawQty = data.quantity !== undefined ? data.quantity : data.itemCount;
    const qtyCheck = parseStrictQuantity(rawQty);
    if (!qtyCheck.isValid) {
      const err = new Error(qtyCheck.error);
      err.status = 400;
      throw err;
    }

    const rawWt = data.declaredWeightKg !== undefined ? data.declaredWeightKg : data.weight;
    const wtCheck = parseStrictWeight(rawWt);
    if (!wtCheck.isValid) {
      const err = new Error(wtCheck.error);
      err.status = 400;
      throw err;
    }

    // 3. Collection method
    const method = (data.method || 'dropoff').trim().toLowerCase();
    if (!VALID_METHODS.includes(method)) {
      const err = new Error(`Invalid collection method: "${method}". Must be "pickup" or "dropoff".`);
      err.status = 400;
      throw err;
    }

    // 4. Condition state
    let condition = (data.conditionState || data.condition || 'working').trim().toLowerCase();
    if (!VALID_CONDITIONS.includes(condition)) {
      condition = 'working';
    }

    // 5. Selected Facility validation & compatibility
    const centreId = data.centreId || data.centerId;
    if (!centreId || typeof centreId !== 'string') {
      const err = new Error('A target recycling facility must be explicitly selected.');
      err.status = 400;
      throw err;
    }

    const centre = await centreRepository.findById(centreId);
    if (!centre) {
      const err = new Error('Selected recycling facility was not found.');
      err.status = 404;
      throw err;
    }

    // Category compatibility check
    const cleanCategory = data.category.trim();
    const acceptsCategory = Array.isArray(centre.categories) && centre.categories.some(
      (cat) => cat.toLowerCase() === cleanCategory.toLowerCase()
    );

    if (!acceptsCategory) {
      const err = new Error(
        `The selected recycling facility (${centre.name}) does not accept the "${cleanCategory}" waste stream.`
      );
      err.status = 400;
      throw err;
    }

    // Method compatibility check
    if (method === 'pickup' && !centre.pickupAvailable) {
      const err = new Error(
        `The selected recycling facility (${centre.name}) does not offer doorstep pickup services.`
      );
      err.status = 400;
      throw err;
    }

    if (method === 'dropoff' && !centre.dropoffAvailable) {
      const err = new Error(
        `The selected recycling facility (${centre.name}) does not offer direct facility drop-off services.`
      );
      err.status = 400;
      throw err;
    }

    // Single-slot limit check
    if (centre.slotLimitKg && wtCheck.weight > centre.slotLimitKg) {
      const err = new Error(
        `Declared weight (${wtCheck.weight} kg) exceeds the facility's single-slot intake limit of ${centre.slotLimitKg} kg. Please reduce batch weight or select an industrial facility.`
      );
      err.status = 400;
      throw err;
    }

    // 6. Address snapshotting & coordinate handling
    let pickupAddress = null;
    let dropoffFacilityAddress = null;
    let dropoffFacilityCity = null;
    let dropoffFacilityHours = null;
    let latitude = null;
    let longitude = null;

    if (method === 'pickup') {
      if (data.addressId) {
        // Fetch saved address strictly verifying ownership
        const savedAddr = await addressRepository.findByIdAndUserId(data.addressId, customer.id);
        if (!savedAddr) {
          const err = new Error('Specified pickup address was not found in your saved address book.');
          err.status = 400;
          throw err;
        }

        const parts = [
          savedAddr.addressLine,
          savedAddr.city,
          savedAddr.state,
          savedAddr.postalCode,
        ].filter(Boolean);

        pickupAddress = parts.join(', ');
        if (savedAddr.pickupInstructions) {
          pickupAddress += ` (Instructions: ${savedAddr.pickupInstructions})`;
        }
        latitude = savedAddr.latitude;
        longitude = savedAddr.longitude;
      } else if (data.pickupAddress || data.address) {
        const rawAddr = (data.pickupAddress || data.address).trim();
        if (rawAddr.length < 5) {
          const err = new Error('A valid street address of at least 5 characters is required for pickup requests.');
          err.status = 400;
          throw err;
        }
        pickupAddress = rawAddr;

        const rawLat = data.latitude !== undefined ? data.latitude : data.coordinates?.lat;
        const rawLng = data.longitude !== undefined ? data.longitude : data.coordinates?.lng;
        const coordCheck = validateCoordinates(rawLat, rawLng);
        if (!coordCheck.isValid) {
          const err = new Error(coordCheck.error);
          err.status = 400;
          throw err;
        }
        latitude = coordCheck.lat;
        longitude = coordCheck.lng;
      } else {
        const err = new Error('A pickup address or saved address ID is required for doorstep pickup requests.');
        err.status = 400;
        throw err;
      }
    } else {
      // Drop-off request snapshots facility's actual depot address
      dropoffFacilityAddress = centre.address;
      dropoffFacilityCity = centre.city;
      dropoffFacilityHours = centre.operatingHoursSummary || `${centre.openingTime} – ${centre.closingTime}`;
    }

    // 7. Unique request ID and timestamps
    const timestampStr = Date.now().toString().slice(-4);
    const randomSuffix = crypto.randomInt(100, 999);
    const requestId = `EW-${timestampStr}${randomSuffix}`;

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const itemsDesc = data.items && typeof data.items === 'string' && data.items.trim()
      ? data.items.trim()
      : `${data.brand.trim()} ${data.model.trim()}`;

    const channel = method === 'pickup' ? 'Doorstep Pickup' : 'Center Drop-off';

    const initialHistory = {
      eventTimeFormatted: `${dateFormatted}, ${timeFormatted}`,
      eventDescription: `Disposal declaration submitted online (${channel}) for ${cleanCategory} (${itemsDesc}, ${wtCheck.weight} kg).`,
      actor: 'Customer',
    };

    const newRequestPayload = {
      id: requestId,
      userId: customer.id,
      userEmail: customer.email.trim().toLowerCase(),
      customerName: customer.name || customer.email.split('@')[0],
      customerPhone: customer.phone || null,
      centreId: centre.id,
      centreName: centre.name,
      category: cleanCategory,
      brand: data.brand.trim(),
      model: data.model.trim(),
      items: itemsDesc,
      conditionState: condition,
      quantity: qtyCheck.quantity,
      declaredWeightKg: wtCheck.weight,
      method,
      channel,
      pickupAddress,
      dropoffFacilityAddress,
      dropoffFacilityCity,
      dropoffFacilityHours,
      latitude,
      longitude,
      preferredSlot: data.preferredSlot || null,
      notes: data.notes && typeof data.notes === 'string' ? data.notes.trim() : null,
      status: 'Submitted',
      currentStep: 0,
    };

    return requestRepository.create(newRequestPayload, initialHistory);
  },

  /**
   * Retrieves requests belonging to an authenticated customer.
   * @param {object} customer
   * @param {object} options
   * @returns {Promise<{ requests: Array<object>, pagination: object }>}
   */
  async getCustomerRequests(customer, options = {}) {
    return requestRepository.findByCustomerId(customer.id, customer.email, options);
  },

  /**
   * Retrieves a single request verifying customer ownership.
   * @param {object} customer
   * @param {string} requestId
   * @returns {Promise<object>}
   */
  async getCustomerRequestById(customer, requestId) {
    const request = await requestRepository.findById(requestId);
    if (!request) {
      const err = new Error('Collection request not found.');
      err.status = 404;
      throw err;
    }

    const isOwner =
      (request.userId && request.userId === customer.id) ||
      (request.userEmail && request.userEmail.toLowerCase() === customer.email.toLowerCase());

    if (!isOwner) {
      const err = new Error('Access denied: You do not have permission to view this request.');
      err.status = 404; // Return 404 to avoid leaking existence of other customer requests
      throw err;
    }

    return request;
  },

  /**
   * Retrieves chronological history for a request verifying customer ownership.
   * @param {object} customer
   * @param {string} requestId
   * @returns {Promise<Array<object>>}
   */
  async getCustomerRequestHistory(customer, requestId) {
    await this.getCustomerRequestById(customer, requestId);
    return requestRepository.getHistoryByRequestId(requestId);
  },

  /**
   * Allows an authenticated customer to cancel their own request before service commences.
   * @param {object} customer
   * @param {string} requestId
   * @param {string} reason
   * @returns {Promise<object>}
   */
  async cancelCustomerRequest(customer, requestId, reason = '') {
    const request = await this.getCustomerRequestById(customer, requestId);

    if (request.status === 'Cancelled') {
      const err = new Error('This request is already cancelled.');
      err.status = 400;
      throw err;
    }

    if (request.status === 'Rejected') {
      const err = new Error('Cannot cancel a request that has already been rejected.');
      err.status = 400;
      throw err;
    }

    const nonCancellable = [
      'In Transit',
      'Received',
      'Drop-off Completed',
      'Processing',
      'Completed',
      'Recycled',
    ];
    if (nonCancellable.includes(request.status)) {
      const err = new Error('Requests cannot be cancelled once collection, transit, or processing has commenced.');
      err.status = 400;
      throw err;
    }

    const cancelReason = (reason && typeof reason === 'string' && reason.trim())
      ? reason.trim()
      : 'Cancelled by customer';

    const eventDescription = `Request cancelled by customer. Reason: "${cancelReason}". Reserved capacity released.`;

    return requestRepository.updateStatusWithHistory(
      requestId,
      'Cancelled',
      -1,
      'Customer',
      eventDescription,
      { cancellationReason: cancelReason }
    );
  },

  /**
   * Retrieves requests assigned to an authenticated facility.
   * @param {object} centre
   * @param {object} options
   * @returns {Promise<{ requests: Array<object>, pagination: object }>}
   */
  async getCentreRequests(centre, options = {}) {
    return requestRepository.findByCentreId(centre.id, options);
  },

  /**
   * Retrieves an assigned request verifying facility assignment.
   * @param {object} centre
   * @param {string} requestId
   * @returns {Promise<object>}
   */
  async getCentreRequestById(centre, requestId) {
    const request = await requestRepository.findById(requestId);
    if (!request) {
      const err = new Error('Collection request not found.');
      err.status = 404;
      throw err;
    }

    if (request.centreId !== centre.id) {
      const err = new Error('Access denied: This request is assigned to another recycling facility.');
      err.status = 403;
      throw err;
    }

    return request;
  },

  /**
   * Retrieves chronological history for an assigned facility request.
   * @param {object} centre
   * @param {string} requestId
   * @returns {Promise<Array<object>>}
   */
  async getCentreRequestHistory(centre, requestId) {
    await this.getCentreRequestById(centre, requestId);
    return requestRepository.getHistoryByRequestId(requestId);
  },

  /**
   * Updates an assigned request status through an authorized facility transition.
   * @param {object} centre
   * @param {string} requestId
   * @param {string} newStatus
   * @param {object} options
   * @returns {Promise<object>}
   */
  async transitionStatusByCentre(centre, requestId, newStatus, { reason = '', note = '', receivedWeightKg } = {}) {
    const request = await this.getCentreRequestById(centre, requestId);

    if (request.status === newStatus) {
      return request; // Idempotent return
    }

    if (request.status === 'Cancelled' || request.status === 'Rejected') {
      const err = new Error(`Cannot update a request that has already been ${request.status.toLowerCase()}.`);
      err.status = 400;
      throw err;
    }

    // Allowed transition mapping for facility staff
    const ALLOWED_CENTRE_TRANSITIONS = {
      'Accepted': ['Submitted'],
      'In Transit': ['Submitted', 'Accepted', 'Schedule Proposed', 'Scheduled', 'Confirmed'],
      'Received': ['Submitted', 'Accepted', 'Scheduled', 'Confirmed', 'In Transit'],
      'Drop-off Completed': ['Submitted', 'Accepted', 'Scheduled', 'Confirmed'],
      'Processing': ['Received', 'Drop-off Completed'],
      'Completed': ['Processing', 'Received', 'Drop-off Completed'],
      'Recycled': ['Completed', 'Processing'],
      'Rejected': ['Submitted', 'Accepted', 'Schedule Proposed', 'Scheduled', 'Confirmed'],
    };

    const validPriorStates = ALLOWED_CENTRE_TRANSITIONS[newStatus];
    if (!validPriorStates) {
      const err = new Error(`Unsupported or unpermitted target status for facility staff: "${newStatus}".`);
      err.status = 400;
      throw err;
    }

    if (!validPriorStates.includes(request.status)) {
      const err = new Error(
        `Invalid status transition: Cannot transition from "${request.status}" to "${newStatus}".`
      );
      err.status = 400;
      throw err;
    }

    const stepIndex = STATUS_STEP_MAP[newStatus] ?? request.currentStep ?? 0;
    const extraUpdates = {};
    let eventDescription = '';

    if (newStatus === 'Rejected') {
      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        const err = new Error('A valid rejection reason of at least 3 characters is required.');
        err.status = 400;
        throw err;
      }
      extraUpdates.rejectionReason = reason.trim();
      eventDescription = `Request rejected by ${centre.name}. Reason: "${reason.trim()}". Processing capacity released.`;
    } else if (newStatus === 'Received') {
      if (receivedWeightKg !== undefined) {
        const wtCheck = parseStrictWeight(receivedWeightKg);
        if (!wtCheck.isValid) {
          const err = new Error(wtCheck.error);
          err.status = 400;
          throw err;
        }
        extraUpdates.receivedWeightKg = wtCheck.weight;
        extraUpdates.weightDiscrepancyKg = Number((wtCheck.weight - request.declaredWeightKg).toFixed(2));
      }
      eventDescription = note && typeof note === 'string' && note.trim()
        ? note.trim()
        : `Hardware physically received and inspected at ${centre.name}. Chain-of-custody confirmed.`;
    } else if (newStatus === 'Accepted') {
      eventDescription = note && typeof note === 'string' && note.trim()
        ? note.trim()
        : `Request accepted by ${centre.name}. Ready for collection/drop-off scheduling.`;
    } else if (newStatus === 'In Transit') {
      eventDescription = note && typeof note === 'string' && note.trim()
        ? note.trim()
        : `Hardware in transit. Collection team dispatched by ${centre.name}.`;
    } else if (newStatus === 'Drop-off Completed') {
      eventDescription = note && typeof note === 'string' && note.trim()
        ? note.trim()
        : `Direct facility drop-off verified and completed at ${centre.name}.`;
    } else if (newStatus === 'Processing') {
      eventDescription = note && typeof note === 'string' && note.trim()
        ? note.trim()
        : `E-waste disassembly and material recovery processing underway at ${centre.name}.`;
    } else if (newStatus === 'Completed') {
      eventDescription = note && typeof note === 'string' && note.trim()
        ? note.trim()
        : `E-waste depollution and recycling completed by ${centre.name}.`;
    } else if (newStatus === 'Recycled') {
      eventDescription = note && typeof note === 'string' && note.trim()
        ? note.trim()
        : `Materials recovered and recycled by ${centre.name}. Zero landfill verification recorded.`;
    }

    return requestRepository.updateStatusWithHistory(
      requestId,
      newStatus,
      stepIndex,
      'Centre Staff',
      eventDescription,
      extraUpdates
    );
  },
};

export default requestService;
