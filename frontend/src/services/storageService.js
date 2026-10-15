/**
 * EcoCycle Temporary Persistence Service
 *
 * ARCHITECTURE NOTE:
 * This module encapsulates all e-waste registration and collection request persistence.
 * Currently backed by browser localStorage as a temporary persistence layer for review sessions.
 *
 * This service layer is cleanly decoupled so that when Oracle Database integration resumes,
 * this file will be replaced with real backend API calls (e.g., fetch('/api/requests'))
 * without requiring changes to UI components.
 *
 * DISCLAIMER & LIMITATIONS:
 * - Client-side localStorage does NOT provide server-side security, multi-user authentication,
 *   or relational database ACID persistence.
 * - Records are stored locally in the demonstrator's browser.
 * - No mock data is seeded or preloaded; all records originate strictly from user form submissions.
 */

const STORAGE_KEY_PREFIX = 'ecocycle_requests_';

const STATUS_STEP_MAP = {
  'Submitted': 0,
  'Scheduled': 1,
  'In Transit': 2,
  'Recycled': 3,
};

function getStorageKey(userEmail) {
  if (!userEmail) return 'ecocycle_requests_anonymous';
  return `${STORAGE_KEY_PREFIX}${userEmail.trim().toLowerCase()}`;
}

export const storageService = {
  /**
   * Retrieves all requests for the specified user email.
   * Returns empty array if no requests have been submitted (no dummy/seed data).
   */
  getRequests(userEmail) {
    if (!userEmail) return [];
    try {
      const raw = localStorage.getItem(getStorageKey(userEmail));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.error('[storageService] Failed to read requests from localStorage', err);
      return [];
    }
  },

  /**
   * Retrieves a single request by ID.
   */
  getRequestById(userEmail, requestId) {
    const list = this.getRequests(userEmail);
    return list.find((r) => r.id === requestId) || null;
  },

  /**
   * Saves a newly submitted e-waste registration and request.
   * Validates payload, assigns unique request ID, and appends to storage.
   */
  createRequest(userEmail, requestData) {
    if (!userEmail) {
      throw new Error('User email is required to associate e-waste declarations.');
    }

    if (!requestData.brand || !requestData.model || !requestData.category) {
      throw new Error('Missing required hardware specifications.');
    }

    // Generate unique request ID based on timestamp and random seed
    const timestamp = Date.now().toString().slice(-4);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const uniqueId = `EW-${timestamp}${randomSuffix}`;

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newRecord = {
      id: uniqueId,
      userEmail: userEmail.trim().toLowerCase(),
      items: `${requestData.brand.trim()} ${requestData.model.trim()}`,
      brand: requestData.brand.trim(),
      model: requestData.model.trim(),
      category: requestData.category,
      condition: requestData.condition || 'working',
      quantity: Number(requestData.quantity) || 1,
      weight: Number(requestData.weight) || 1,
      channel: requestData.method === 'pickup' ? 'Doorstep Pickup' : 'Center Drop-off',
      method: requestData.method,
      address: requestData.method === 'pickup' ? (requestData.address?.trim() || 'Specified Pickup Address') : 'Self Drop-off at Center Kiosk',
      center: requestData.center || 'Metro GreenTech Recycling Hub',
      notes: requestData.notes?.trim() || '',
      date: dateFormatted,
      status: 'Submitted',
      currentStep: 0,
      createdAt: new Date().toISOString(),
      history: [
        {
          time: `${dateFormatted}, ${timeFormatted}`,
          event: `Disposal declaration submitted online (${requestData.method === 'pickup' ? 'Doorstep Pickup' : 'Center Drop-off'})`,
        },
      ],
    };

    const currentList = this.getRequests(userEmail);
    const updatedList = [newRecord, ...currentList];

    try {
      localStorage.setItem(getStorageKey(userEmail), JSON.stringify(updatedList));
      return newRecord;
    } catch (err) {
      console.error('[storageService] Failed to write new request to localStorage', err);
      throw new Error('Storage write failed. Please check browser storage quotas.');
    }
  },

  /**
   * Updates collection status and records a timestamped history entry.
   * Useful for review demonstrations showing the lifecycle progression.
   */
  updateRequestStatus(userEmail, requestId, newStatus, customNote = '') {
    if (!userEmail || !requestId) {
      throw new Error('User email and request ID are required.');
    }

    const currentList = this.getRequests(userEmail);
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const stepIndex = STATUS_STEP_MAP[newStatus] ?? 0;
    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: customNote || `Status updated to ${newStatus}`,
    };

    const existingHistory = Array.isArray(currentList[targetIdx].history)
      ? currentList[targetIdx].history
      : [];

    const updatedRecord = {
      ...currentList[targetIdx],
      status: newStatus,
      currentStep: stepIndex,
      updatedAt: new Date().toISOString(),
      history: [...existingHistory, historyEntry],
    };

    currentList[targetIdx] = updatedRecord;

    try {
      localStorage.setItem(getStorageKey(userEmail), JSON.stringify(currentList));
      return updatedRecord;
    } catch (err) {
      console.error('[storageService] Failed to update request status', err);
      throw new Error('Failed to persist status update.');
    }
  },

  /**
   * Deletes a request by ID.
   */
  deleteRequest(userEmail, requestId) {
    if (!userEmail) return;
    const currentList = this.getRequests(userEmail);
    const filtered = currentList.filter((r) => r.id !== requestId);
    localStorage.setItem(getStorageKey(userEmail), JSON.stringify(filtered));
  },

  /**
   * Clears all requests for a user.
   */
  clearRequests(userEmail) {
    if (!userEmail) return;
    localStorage.removeItem(getStorageKey(userEmail));
  },
};

