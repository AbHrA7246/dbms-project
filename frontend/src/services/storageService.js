/**
 * EcoCycle Persistence Service
 *
 * ARCHITECTURE NOTE:
 * Encapsulates all e-waste registrations, collection requests, appointments, and centre metadata.
 * Backed by browser localStorage as a temporary persistence layer.
 * Decoupled behind a clear service API so it can be swapped with Oracle REST API calls later.
 *
 * All records originate from actual user and facility registrations; both Customer and Centre
 * portals read and mutate the same master record store.
 */

const MASTER_REQUESTS_KEY = 'ecocycle_master_requests';
const CENTRES_DATA_KEY = 'ecocycle_centres_data';
const LEGACY_KEY_PREFIX = 'ecocycle_requests_';
export const CUSTOMER_HIDDEN_PREFIX = 'ecocycle_hidden_requests_';
export const CENTRE_HIDDEN_PREFIX = 'ecocycle_hidden_centre_requests_';

export const UNRESOLVED_REQUEST_STATUSES = [
  'Submitted',
  'Accepted',
  'Schedule Proposed',
  'Scheduled',
  'Confirmed',
  'In Transit',
  'Reschedule Requested',
];

export const RESOLVED_REQUEST_STATUSES = [
  'Received',
  'Drop-off Completed',
  'Processing',
  'Completed',
  'Recycled',
  'Rejected',
  'Cancelled',
];

export function isRequestUnresolved(status) {
  if (!status) return false;
  return UNRESOLVED_REQUEST_STATUSES.includes(status);
}

export function isEligibleForHistoryHiding(status) {
  if (!status) return false;
  return RESOLVED_REQUEST_STATUSES.includes(status);
}

// Known demo identifiers to sanitize if remaining from previous test runs
const DEMO_CENTRE_IDS = new Set(['center-1', 'center-2', 'center-3', 'center-4']);
const DEMO_CENTRE_NAMES = new Set([
  'metro greentech recycling hub',
  'central ecorecycle depot',
  'apex material recovery & refining',
  'community cleantech drop point',
]);

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

export const CATEGORY_MAP = {
  computing: ['Computers & Laptops', 'Servers & Telecom Infrastructure'],
  mobile: ['Smartphones & Tablets'],
  battery: ['Batteries & Power Units'],
  peripherals: ['Displays & Monitors', 'Computers & Laptops'],
  appliances: ['Home & Office Appliances', 'Servers & Telecom Infrastructure'],
};

export const STANDARD_SLOTS = [
  '09:00 AM – 11:00 AM',
  '11:00 AM – 01:00 PM',
  '02:00 PM – 04:00 PM',
  '04:00 PM – 06:00 PM',
];

export function isCentreEligibleForRequest(centre, { category, method }) {
  if (!centre) return false;
  // 1. Service type capability check
  if (method === 'pickup' && !centre.pickupAvailable) {
    return false;
  }
  if (method === 'dropoff' && !centre.dropoffAvailable) {
    return false;
  }
  // 2. Category capability check
  if (category) {
    const acceptedList = Array.isArray(centre.accepted) ? centre.accepted : [];
    const validMapped = CATEGORY_MAP[category] || [category];
    const acceptsCategory = acceptedList.some((acc) => {
      const lowerAcc = (acc || '').toLowerCase();
      return (
        validMapped.some((v) => v.toLowerCase() === lowerAcc) ||
        lowerAcc.includes(category.toLowerCase()) ||
        (category === 'computing' && (lowerAcc.includes('computer') || lowerAcc.includes('laptop') || lowerAcc.includes('server'))) ||
        (category === 'mobile' && (lowerAcc.includes('smartphone') || lowerAcc.includes('tablet') || lowerAcc.includes('phone') || lowerAcc.includes('mobile'))) ||
        (category === 'battery' && (lowerAcc.includes('batter') || lowerAcc.includes('power'))) ||
        (category === 'peripherals' && (lowerAcc.includes('display') || lowerAcc.includes('monitor') || lowerAcc.includes('peripheral'))) ||
        (category === 'appliances' && (lowerAcc.includes('appliance') || lowerAcc.includes('telecom') || lowerAcc.includes('printer')))
      );
    });
    if (!acceptsCategory) return false;
  }
  return true;
}

export function getStepIndex(status) {
  if (status === 'Rejected' || status === 'Cancelled') return -1;
  switch (status) {
    case 'Submitted':
    case 'Accepted':
    case 'Schedule Proposed':
      return 0;
    case 'Scheduled':
    case 'Confirmed':
    case 'In Transit':
    case 'Reschedule Requested':
      return 1;
    case 'Received':
    case 'Drop-off Completed':
    case 'Processing':
    case 'Completed':
    case 'Recycled':
      return 2;
    default:
      return 0;
  }
}

function dispatchStorageEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ecocycle_storage_update'));
  }
}

function resolveCentreId(nameOrId) {
  if (!nameOrId) return '';
  const centres = storageService.getCentres();
  const foundById = centres.find((c) => c.id === nameOrId);
  if (foundById) return foundById.id;
  const foundByName = centres.find(
    (c) => c.name.toLowerCase() === nameOrId.toLowerCase()
  );
  return foundByName ? foundByName.id : nameOrId;
}

function resolveCentreName(centreId) {
  if (!centreId) return 'Unassigned Facility';
  const centres = storageService.getCentres();
  const found = centres.find((c) => c.id === centreId);
  return found ? found.name : centreId;
}

function formatLocalDate(dateObj) {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getWeekKey(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return formatLocalDate(monday);
}

export const WEEKDAY_CODES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const WEEKDAY_FULL_NAMES = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

const DAY_INDEX_TO_CODE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Formats a structured list of weekday abbreviations into a clean human-readable summary.
 *
 * @param {string[]} [daysList]
 * @returns {string}
 */
export function formatOperatingDays(daysList = []) {
  if (!Array.isArray(daysList) || daysList.length === 0) return 'No days configured';
  const valid = WEEKDAY_CODES.filter((d) => daysList.includes(d));
  if (valid.length === 7) return 'Every day (Mon – Sun)';
  if (valid.length === 5 && !valid.includes('Sat') && !valid.includes('Sun')) {
    return 'Monday to Friday';
  }
  if (valid.length === 6 && !valid.includes('Sun')) {
    return 'Monday to Saturday';
  }
  if (valid.length === 2 && valid.includes('Sat') && valid.includes('Sun')) {
    return 'Weekends (Sat, Sun)';
  }
  return valid.join(', ');
}

/**
 * Parses a legacy operating days string or structured array into a canonical array of weekday codes.
 *
 * @param {string|string[]} daysInput
 * @returns {string[]}
 */
export function parseOperatingDays(daysInput) {
  if (Array.isArray(daysInput) && daysInput.length > 0) {
    const valid = WEEKDAY_CODES.filter((d) => daysInput.includes(d));
    if (valid.length > 0) return valid;
  }
  if (typeof daysInput !== 'string') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const str = daysInput.toLowerCase().trim();
  if (
    str.includes('everyday') ||
    str.includes('all days') ||
    str.includes('7 days') ||
    str.includes('mon – sun') ||
    str.includes('mon - sun') ||
    str.includes('monday to sunday') ||
    (str.includes('sun') && str.includes('mon') && str.includes('sat') && !str.includes('to') && !str.includes('-'))
  ) {
    return [...WEEKDAY_CODES];
  }

  // Ranges
  if (
    str.includes('monday to friday') ||
    str.includes('mon to fri') ||
    str.includes('mon - fri') ||
    str.includes('mon – fri') ||
    str.includes('weekdays')
  ) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  }

  if (
    str.includes('monday to saturday') ||
    str.includes('mon to sat') ||
    str.includes('mon - sat') ||
    str.includes('mon – sat')
  ) {
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }

  if (
    str.includes('tuesday to saturday') ||
    str.includes('tue to sat') ||
    str.includes('tue - sat') ||
    str.includes('tue – sat')
  ) {
    return ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }

  if (str.includes('weekend')) {
    return ['Sat', 'Sun'];
  }

  // Discrete lists (e.g. "Mon, Wed, Fri" or "Monday, Wednesday, Friday")
  const fullToCode = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };
  const discrete = [];
  for (const [full, code] of Object.entries(fullToCode)) {
    if (str.includes(full) || str.includes(code.toLowerCase())) {
      discrete.push(code);
    }
  }
  const ordered = WEEKDAY_CODES.filter((d) => discrete.includes(d));
  if (ordered.length > 0) return ordered;

  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
}

/**
 * Converts a 24-hour time string ("09:00", "17:30") to a formatted 12-hour AM/PM string ("09:00 AM", "05:30 PM").
 *
 * @param {string} time24
 * @returns {string}
 */
export function time24To12(time24) {
  if (!time24 || typeof time24 !== 'string') return '09:00 AM';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) h = 9;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Converts a 12-hour AM/PM time string ("09:00 AM", "5:30 PM") to normalized 24-hour time ("09:00", "17:30").
 *
 * @param {string} time12
 * @returns {string}
 */
export function time12To24(time12) {
  if (!time12 || typeof time12 !== 'string') return '09:00';
  const match = time12.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return '09:00';
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = (match[3] || 'AM').toUpperCase();
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formats opening and closing 24h time strings into a legacy range string ("09:00 AM – 05:00 PM").
 *
 * @param {string} open24
 * @param {string} close24
 * @returns {string}
 */
export function formatOperatingHours(open24, close24) {
  const openStr = time24To12(open24 || '09:00');
  const closeStr = time24To12(close24 || '17:00');
  return `${openStr} – ${closeStr}`;
}

/**
 * Parses a legacy operating hours string into opening and closing 24h strings.
 *
 * @param {string} hoursStr
 * @returns {{ openingTime: string, closingTime: string }}
 */
export function parseOperatingHours(hoursStr) {
  if (!hoursStr || typeof hoursStr !== 'string') {
    return { openingTime: '09:00', closingTime: '17:00' };
  }
  const parts = hoursStr.split(/[–\-—to]+/).map((p) => p.trim());
  if (parts.length >= 2) {
    return {
      openingTime: time12To24(parts[0]),
      closingTime: time12To24(parts[1]),
    };
  }
  return { openingTime: '09:00', closingTime: '17:00' };
}

/**
 * Parses a standard intake slot string (e.g. "09:00 AM – 11:00 AM") into 24-hour startTime and endTime.
 *
 * @param {string} slotStr
 * @returns {{ startTime: string, endTime: string }}
 */
export function parseSlotTimeRange(slotStr) {
  if (!slotStr || typeof slotStr !== 'string') return { startTime: '09:00', endTime: '11:00' };
  const parts = slotStr.split(/[–\-—]+/).map((s) => s.trim());
  if (parts.length >= 2) {
    return {
      startTime: time12To24(parts[0]),
      endTime: time12To24(parts[1]),
    };
  }
  return { startTime: '09:00', endTime: '11:00' };
}

/**
 * Validates a facility schedule: requires at least one operating day, valid times, and closing time > opening time.
 *
 * @param {{ operatingDaysList?: string[], openingDays?: string, openingTime?: string, closingTime?: string }} schedule
 * @returns {{ isValid: boolean, error: string }}
 */
export function validateSchedule(schedule = {}) {
  const days = Array.isArray(schedule.operatingDaysList)
    ? schedule.operatingDaysList
    : (schedule.operatingDays ? parseOperatingDays(schedule.operatingDays) : []);

  if (!days || days.length === 0) {
    return { isValid: false, error: 'At least one operating day must be selected.' };
  }
  const open = schedule.openingTime || '09:00';
  const close = schedule.closingTime || '17:00';

  if (!open || !close) {
    return { isValid: false, error: 'Both opening and closing times are required.' };
  }
  if (open === close) {
    return { isValid: false, error: 'Opening and closing times cannot be identical.' };
  }
  if (close < open) {
    return {
      isValid: false,
      error: 'Closing time must be later than opening time (overnight schedules are not supported for intake slots).',
    };
  }
  return { isValid: true, error: '' };
}

export function isOperatingDay(centreOrDays = 'Monday to Friday', dayOfWeek) {
  // dayOfWeek: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  let daysList = null;
  let str = '';

  if (centreOrDays && typeof centreOrDays === 'object') {
    if (Array.isArray(centreOrDays.operatingDaysList) && centreOrDays.operatingDaysList.length > 0) {
      daysList = centreOrDays.operatingDaysList;
    } else if (Array.isArray(centreOrDays) && centreOrDays.length > 0) {
      daysList = centreOrDays;
    } else if (centreOrDays.operatingDays) {
      str = String(centreOrDays.operatingDays).toLowerCase();
    }
  } else if (typeof centreOrDays === 'string') {
    str = centreOrDays.toLowerCase();
  }

  // If structured array is available:
  if (Array.isArray(daysList) && daysList.length > 0) {
    const dayCode = DAY_INDEX_TO_CODE[dayOfWeek];
    return daysList.includes(dayCode);
  }

  // Fallback to legacy string parsing:
  if (!str) str = 'monday to friday';
  if (
    str.includes('everyday') ||
    str.includes('all days') ||
    str.includes('7 days') ||
    (str.includes('sunday') && str.includes('monday'))
  ) {
    return true;
  }
  if (str.includes('saturday')) {
    if (str.includes('tuesday')) {
      return dayOfWeek >= 2 && dayOfWeek <= 6;
    }
    return dayOfWeek >= 1 && dayOfWeek <= 6;
  }
  // Default: Monday to Friday
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

export function getActiveDaysCount(centreOrDays = 'Monday to Friday') {
  if (centreOrDays && typeof centreOrDays === 'object') {
    if (Array.isArray(centreOrDays.operatingDaysList) && centreOrDays.operatingDaysList.length > 0) {
      return centreOrDays.operatingDaysList.length;
    }
    if (Array.isArray(centreOrDays) && centreOrDays.length > 0) {
      return centreOrDays.length;
    }
    if (centreOrDays.operatingDays) {
      centreOrDays = centreOrDays.operatingDays;
    }
  }
  const str = (typeof centreOrDays === 'string' ? centreOrDays : '').toLowerCase();
  if (
    str.includes('everyday') ||
    str.includes('all days') ||
    str.includes('7 days') ||
    (str.includes('sunday') && str.includes('monday'))
  ) {
    return 7;
  }
  if (str.includes('saturday')) {
    if (str.includes('tuesday')) {
      return 5;
    }
    return 6;
  }
  const parsed = parseOperatingDays(str);
  if (parsed && parsed.length > 0) {
    return parsed.length;
  }
  return 5;
}

export function getCentreCapacityLimits(centre) {
  if (!centre) return null;
  const activeDays = getActiveDaysCount(centre);
  const maxWeeklyKg = Number(centre.maxWeeklyCapacityKg);
  const validMaxWeeklyKg = !isNaN(maxWeeklyKg) && maxWeeklyKg > 0 ? maxWeeklyKg : 3000;
  const maxWeeklyUnits = Number(centre.maxWeeklyUnits) || 800;

  const dailyMaxKg = Math.ceil(validMaxWeeklyKg / activeDays);
  const dailyMaxUnits = Math.ceil(maxWeeklyUnits / activeDays);

  const numSlots = STANDARD_SLOTS.length;
  const configuredSlotLimitKg = Number(centre.slotLimitKg);
  const slotMaxKg = !isNaN(configuredSlotLimitKg) && configuredSlotLimitKg > 0
    ? configuredSlotLimitKg
    : Math.ceil(dailyMaxKg / numSlots);
  const slotMaxUnits = Math.ceil(dailyMaxUnits / numSlots);

  return {
    validMaxWeeklyKg,
    maxWeeklyUnits,
    dailyMaxKg,
    dailyMaxUnits,
    slotMaxKg,
    slotMaxUnits,
  };
}

export function checkRequestFeasibility(centre, { weight, quantity } = {}) {
  if (!centre) {
    return { feasible: false, reason: 'No recycling facility specified.' };
  }
  const limits = getCentreCapacityLimits(centre);
  if (!limits) {
    return { feasible: false, reason: 'Unable to calculate facility intake limits.' };
  }

  const reqWeight = Number(weight);
  const reqQty = Number(quantity);

  if (Number.isFinite(reqWeight) && reqWeight > limits.slotMaxKg) {
    return {
      feasible: false,
      reason: `Declared weight (${reqWeight} kg) exceeds the facility's maximum single-slot intake limit of ${limits.slotMaxKg} kg. Declarations cannot be split across multiple appointment slots. Please reduce the batch weight or select an industrial facility configured for heavier bulk intake.`,
      limits,
      violationType: 'weight',
      excessWeight: reqWeight - limits.slotMaxKg,
      maxAllowed: limits.slotMaxKg,
    };
  }

  if (Number.isFinite(reqQty) && reqQty > limits.slotMaxUnits) {
    return {
      feasible: false,
      reason: `Declared quantity (${reqQty} units) exceeds the facility's maximum single-slot intake limit of ${limits.slotMaxUnits} units. Please adjust your batch size or select another facility.`,
      limits,
      violationType: 'quantity',
      excessUnits: reqQty - limits.slotMaxUnits,
      maxAllowed: limits.slotMaxUnits,
    };
  }

  return { feasible: true, limits };
}

export function validateServiceArea(centre, address) {
  if (!centre) {
    return { inArea: true, indeterminate: false, message: '' };
  }
  if (!address || typeof address !== 'string' || !address.trim()) {
    return { inArea: false, indeterminate: true, message: 'Pickup address is required.' };
  }

  const normAddress = address.toLowerCase();
  const centreCity = (centre.city || '').toLowerCase().trim();
  const centreArea = (centre.serviceArea || '').toLowerCase().trim();

  // If address explicitly contains facility city
  if (centreCity && centreCity.length >= 2 && normAddress.includes(centreCity)) {
    return {
      inArea: true,
      indeterminate: false,
      matchedZone: centreCity,
      message: `Address is within verified facility service area (${centre.city}).`,
    };
  }

  // Extract phrases from serviceArea (e.g. comma/semicolon/slash separated)
  const areaPhrases = centreArea
    .split(/[,;&/|]|\band\b/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  for (const phrase of areaPhrases) {
    if (normAddress.includes(phrase)) {
      return {
        inArea: true,
        indeterminate: false,
        matchedZone: phrase,
        message: `Address matches facility service area (${phrase}).`,
      };
    }
  }

  // Significant individual keywords from city and serviceArea (> 3 chars, skip generic words)
  const stopWords = new Set([
    'area', 'greater', 'metro', 'region', 'central', 'county', 'district',
    'city', 'valley', 'north', 'south', 'east', 'west', 'bay', 'all'
  ]);
  const areaWords = `${centreCity} ${centreArea}`
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w));

  for (const word of areaWords) {
    if (normAddress.includes(word)) {
      return {
        inArea: true,
        indeterminate: false,
        matchedZone: word,
        message: `Address appears to match facility region (${word}).`,
      };
    }
  }

  const targetAreaDisplay = centre.serviceArea || centre.city || 'designated service zone';
  return {
    inArea: false,
    indeterminate: !normAddress.includes(',') && normAddress.split(/\s+/).length < 4,
    targetArea: targetAreaDisplay,
    message: `Pickup location may be outside ${centre.name}'s designated service area (${targetAreaDisplay}). Doorstep courier pickups may experience out-of-zone delays or require dispatch confirmation.`,
  };
}

export function getRequestDisplayAddress(request, centres = null) {
  if (!request) return '';
  if (request.method === 'dropoff') {
    // If request already has specific drop-off depot address saved (and isn't the generic kiosk string)
    if (
      request.address &&
      request.address.trim() &&
      request.address !== 'Self Drop-off at Center Kiosk' &&
      request.address !== 'Specified Pickup Address'
    ) {
      return request.address;
    }
    // Dynamic lookup for historical drop-off declarations
    const allCentres = centres || storageService.getCentres();
    const centre = allCentres.find(
      (c) =>
        (request.centreId && c.id === request.centreId) ||
        (request.center && c.name && c.name.toLowerCase() === request.center.toLowerCase())
    );
    if (centre && centre.address) {
      const hoursStr = centre.hours || '09:00 AM – 05:00 PM';
      return `${centre.name} — ${centre.address}, ${centre.city} (${hoursStr})`;
    }
    return request.address || 'Facility Drop-off Depot';
  }
  return request.address || 'Doorstep Pickup Address';
}

export const storageService = {
  // ── Master Requests Collection (Single Source of Truth) ──

  getAllRequests() {
    try {
      let master = [];
      const rawMaster = localStorage.getItem(MASTER_REQUESTS_KEY);
      if (rawMaster) {
        master = JSON.parse(rawMaster);
      }

      // Check legacy per-user stores and merge any unindexed requests
      let needsSync = false;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LEGACY_KEY_PREFIX)) {
          try {
            const userRecords = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(userRecords)) {
              userRecords.forEach((record) => {
                if (!master.some((m) => m.id === record.id)) {
                  if (!record.centreId && record.center) {
                    record.centreId = resolveCentreId(record.center);
                  }
                  master.push(record);
                  needsSync = true;
                }
              });
            }
          } catch (e) {
            // Ignore parse error on single key
          }
        }
      }

      if (needsSync) {
        localStorage.setItem(MASTER_REQUESTS_KEY, JSON.stringify(master));
      }

      return Array.isArray(master) ? master : [];
    } catch (err) {
      console.error('[storageService] Failed to read master requests', err);
      return [];
    }
  },

  saveMasterRequests(requests) {
    try {
      localStorage.setItem(MASTER_REQUESTS_KEY, JSON.stringify(requests));
      // Also update per-user stores for backward compatibility
      const byUser = {};
      requests.forEach((r) => {
        const email = (r.userEmail || '').trim().toLowerCase();
        if (email) {
          if (!byUser[email]) byUser[email] = [];
          byUser[email].push(r);
        }
      });
      Object.keys(byUser).forEach((email) => {
        localStorage.setItem(`${LEGACY_KEY_PREFIX}${email}`, JSON.stringify(byUser[email]));
      });
      dispatchStorageEvent();
    } catch (err) {
      console.error('[storageService] Failed to save master requests', err);
      throw new Error('Failed to persist requests in browser storage.');
    }
  },

  // ── Customer Interface Methods ──

  getRequests(userEmail) {
    if (!userEmail) return [];
    const normalized = userEmail.trim().toLowerCase();
    const all = this.getAllRequests();
    return all.filter((r) => (r.userEmail || '').toLowerCase() === normalized);
  },

  getRequestById(requestId) {
    const all = this.getAllRequests();
    return all.find((r) => r.id === requestId) || null;
  },

  createRequest(userEmail, requestData) {
    if (!userEmail) {
      throw new Error('User email is required to associate e-waste declarations.');
    }

    if (!requestData.brand || !requestData.model || !requestData.category) {
      throw new Error('Missing required hardware specifications.');
    }

    // Weight validation: reject missing, non-numeric, zero, negative, or malformed numeric strings
    if (
      requestData.weight === undefined ||
      requestData.weight === null ||
      requestData.weight === '' ||
      (typeof requestData.weight === 'string' && requestData.weight.trim() === '')
    ) {
      throw new Error('E-waste weight is required and must be greater than 0 kg.');
    }
    if (typeof requestData.weight === 'string') {
      const trimmedWt = requestData.weight.trim();
      if (!/^\d+(\.\d+)?$/.test(trimmedWt)) {
        throw new Error('Invalid e-waste weight: Weight must be a valid positive numeric value.');
      }
    }
    const parsedWeight = typeof requestData.weight === 'number' ? requestData.weight : Number(requestData.weight);
    if (!Number.isFinite(parsedWeight) || isNaN(parsedWeight) || parsedWeight <= 0) {
      throw new Error('Invalid e-waste weight: Weight must be a positive number greater than 0 kg.');
    }
    if (parsedWeight > 5000) {
      throw new Error('E-waste weight exceeds maximum allowable single declaration limit of 5,000 kg.');
    }
    const finalWeight = Number(parsedWeight.toFixed(2));

    // Quantity validation: reject missing, non-numeric, zero, negative, non-integer, or malformed strings
    const rawQuantity = requestData.quantity !== undefined ? requestData.quantity : requestData.itemCount;
    if (
      rawQuantity === undefined ||
      rawQuantity === null ||
      rawQuantity === '' ||
      (typeof rawQuantity === 'string' && rawQuantity.trim() === '')
    ) {
      throw new Error('E-waste quantity is required and must be at least 1 unit.');
    }
    if (typeof rawQuantity === 'string') {
      const trimmedQty = rawQuantity.trim();
      if (!/^\d+$/.test(trimmedQty)) {
        throw new Error('Invalid e-waste quantity: Quantity must be a positive whole number.');
      }
    }
    const parsedQuantity = typeof rawQuantity === 'number' ? rawQuantity : Number(rawQuantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      throw new Error('Invalid e-waste quantity: Quantity must be a positive whole number of at least 1 unit.');
    }
    if (parsedQuantity > 1000) {
      throw new Error('E-waste quantity exceeds maximum allowable single declaration limit of 1,000 units.');
    }
    const finalQuantity = parsedQuantity;

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

    const assignedCentreId = requestData.centreId || resolveCentreId(requestData.center);
    const assignedCentreName = requestData.center || resolveCentreName(assignedCentreId);
    const assignedCentre = assignedCentreId ? this.getCentreById(assignedCentreId) : null;

    // Fundamental feasibility check against centre single-slot intake capacity
    if (assignedCentre && !requestData.bypassFeasibility) {
      const feasibility = checkRequestFeasibility(assignedCentre, {
        weight: finalWeight,
        quantity: finalQuantity,
      });
      if (!feasibility.feasible) {
        throw new Error(feasibility.reason);
      }
    }

    const newRecord = {
      id: uniqueId,
      userEmail: userEmail.trim().toLowerCase(),
      customerName: requestData.customerName || userEmail.split('@')[0],
      customerPhone: requestData.customerPhone || '',
      items: `${requestData.brand.trim()} ${requestData.model.trim()}`,
      brand: requestData.brand.trim(),
      model: requestData.model.trim(),
      category: requestData.category,
      condition: requestData.condition || 'working',
      quantity: finalQuantity,
      itemCount: finalQuantity,
      weight: finalWeight,
      channel: requestData.method === 'pickup' ? 'Doorstep Pickup' : 'Center Drop-off',
      method: requestData.method || 'dropoff',
      address:
        requestData.method === 'pickup'
          ? (requestData.address?.trim() || 'Specified Pickup Address')
          : (assignedCentre && assignedCentre.address
              ? `${assignedCentre.name} — ${assignedCentre.address}, ${assignedCentre.city} (${assignedCentre.hours || '09:00 AM – 05:00 PM'})`
              : (requestData.address?.trim() && requestData.address !== 'Self Drop-off at Center Kiosk'
                  ? requestData.address.trim()
                  : `${assignedCentreName} Drop-off Kiosk`)),
      dropoffFacilityAddress: assignedCentre?.address || '',
      dropoffFacilityCity: assignedCentre?.city || '',
      dropoffFacilityHours: assignedCentre?.hours || '',
      center: assignedCentreName,
      centreId: assignedCentreId,
      preferredSlot: requestData.preferredSlot || '',
      notes: requestData.notes?.trim() || '',
      date: dateFormatted,
      status: 'Submitted', // Initial State
      currentStep: 0,
      createdAt: new Date().toISOString(),
      appointment: null,
      rejectionReason: '',
      coordinates: requestData.coordinates || null,
      history: [
        {
          time: `${dateFormatted}, ${timeFormatted}`,
          event: `Disposal declaration submitted online (${
            requestData.method === 'pickup' ? 'Doorstep Pickup' : 'Center Drop-off'
          })`,
          actor: 'Customer',
        },
      ],
    };

    const currentList = this.getAllRequests();
    const updatedList = [newRecord, ...currentList];
    this.saveMasterRequests(updatedList);
    return newRecord;
  },

  updateRequestStatus(userEmailOrRequestId, requestIdOrStatus, newStatusOrNote, customNote = '') {
    let userEmail = null;
    let requestId = userEmailOrRequestId;
    let newStatus = requestIdOrStatus;
    let note = newStatusOrNote || '';

    if (
      typeof userEmailOrRequestId === 'string' &&
      userEmailOrRequestId.includes('@') &&
      requestIdOrStatus !== undefined
    ) {
      userEmail = userEmailOrRequestId;
      requestId = requestIdOrStatus;
      newStatus = newStatusOrNote;
      note = customNote || '';
    }

    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];
    if (userEmail && req.userEmail && req.userEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
      throw new Error('Unauthorized: You can only update requests submitted by your account.');
    }

    // Idempotency: if request is already in target status, return record
    if (currentList[targetIdx].status === newStatus) {
      return currentList[targetIdx];
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
      actor: userEmail ? 'Customer' : 'System',
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
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  // ── Customer Appointment Response ──

  respondToAppointment(requestId, userEmail, responseType, note = '') {
    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];
    if (userEmail && req.userEmail && req.userEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
      throw new Error('Unauthorized: You can only respond to appointments for your own requests.');
    }
    if (!req.appointment) {
      throw new Error('No appointment proposal found for this request.');
    }

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    let newStatus = req.status;
    let eventDescription = '';

    if (responseType === 'confirm') {
      newStatus = 'Confirmed';
      req.appointment.status = 'confirmed';
      eventDescription = `Appointment proposal confirmed by customer for ${req.appointment.date} (${req.appointment.timeWindow}).`;
    } else if (responseType === 'reschedule') {
      newStatus = 'Reschedule Requested';
      req.appointment.status = 'reschedule_requested';
      req.appointment.customerNote = note;
      eventDescription = `Customer requested rescheduling. Note: ${note || 'Alternative timing requested'}`;
    } else if (responseType === 'decline') {
      newStatus = 'Cancelled';
      req.appointment.status = 'cancelled';
      eventDescription = `Customer declined appointment proposal. Reason: ${note || 'Cancelled by customer'}`;
    } else {
      throw new Error(`Invalid response type: ${responseType}`);
    }

    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: eventDescription,
      actor: 'Customer',
    };

    const updatedRecord = {
      ...req,
      status: newStatus,
      currentStep: STATUS_STEP_MAP[newStatus] ?? req.currentStep,
      updatedAt: new Date().toISOString(),
      history: [...(req.history || []), historyEntry],
    };

    currentList[targetIdx] = updatedRecord;
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  clearRequests(userEmail) {
    return this.clearCustomerHistory(userEmail);
  },

  // ── History Visibility Management (Independent from Original Master Records) ──

  getCustomerHiddenIds(userEmail) {
    if (!userEmail) return [];
    try {
      const normalized = userEmail.trim().toLowerCase();
      const raw = localStorage.getItem(`${CUSTOMER_HIDDEN_PREFIX}${normalized}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[storageService] Failed to read hidden requests for customer', e);
      return [];
    }
  },

  saveCustomerHiddenIds(userEmail, ids) {
    if (!userEmail) return [];
    try {
      const normalized = userEmail.trim().toLowerCase();
      const uniqueIds = Array.from(new Set(ids));
      localStorage.setItem(`${CUSTOMER_HIDDEN_PREFIX}${normalized}`, JSON.stringify(uniqueIds));
      dispatchStorageEvent();
      return uniqueIds;
    } catch (e) {
      console.error('[storageService] Failed to save customer hidden IDs', e);
      return [];
    }
  },

  hideCustomerRequest(userEmail, requestId) {
    if (!userEmail || !requestId) return;
    const req = this.getRequestById(requestId);
    if (!req) throw new Error('Transaction record not found.');
    if (userEmail && req.userEmail && req.userEmail.trim().toLowerCase() !== userEmail.trim().toLowerCase()) {
      throw new Error('Access denied: You can only hide requests submitted by your account.');
    }
    if (!isEligibleForHistoryHiding(req.status)) {
      throw new Error(`Active requests with status "${req.status}" cannot be hidden from view.`);
    }
    const current = this.getCustomerHiddenIds(userEmail);
    if (!current.includes(requestId)) {
      return this.saveCustomerHiddenIds(userEmail, [...current, requestId]);
    }
    return current;
  },

  hideCustomerRequests(userEmail, requestIds = []) {
    if (!userEmail || !Array.isArray(requestIds) || requestIds.length === 0) return [];
    const all = this.getRequests(userEmail);
    const eligibleIds = requestIds.filter((id) => {
      const req = all.find((r) => r.id === id);
      return req && isEligibleForHistoryHiding(req.status);
    });
    const current = this.getCustomerHiddenIds(userEmail);
    return this.saveCustomerHiddenIds(userEmail, [...current, ...eligibleIds]);
  },

  clearCustomerHistory(userEmail) {
    if (!userEmail) return [];
    const customerRequests = this.getRequests(userEmail);
    // Only hide eligible historical requests; strictly keep active requests visible
    const eligibleHistorical = customerRequests.filter((r) => isEligibleForHistoryHiding(r.status));
    const eligibleIds = eligibleHistorical.map((r) => r.id);
    const current = this.getCustomerHiddenIds(userEmail);
    return this.saveCustomerHiddenIds(userEmail, [...current, ...eligibleIds]);
  },

  restoreCustomerRequest(userEmail, requestId) {
    if (!userEmail || !requestId) return;
    const current = this.getCustomerHiddenIds(userEmail);
    const updated = current.filter((id) => id !== requestId);
    return this.saveCustomerHiddenIds(userEmail, updated);
  },

  restoreCustomerRequests(userEmail, requestIds = []) {
    if (!userEmail || !Array.isArray(requestIds)) return;
    const toRestore = new Set(requestIds);
    const current = this.getCustomerHiddenIds(userEmail);
    const updated = current.filter((id) => !toRestore.has(id));
    return this.saveCustomerHiddenIds(userEmail, updated);
  },

  restoreAllCustomerHistory(userEmail) {
    if (!userEmail) return;
    try {
      const normalized = userEmail.trim().toLowerCase();
      localStorage.removeItem(`${CUSTOMER_HIDDEN_PREFIX}${normalized}`);
      dispatchStorageEvent();
    } catch (e) {}
  },

  isCustomerRequestHidden(userEmail, requestId) {
    if (!userEmail || !requestId) return false;
    const hidden = this.getCustomerHiddenIds(userEmail);
    return hidden.includes(requestId);
  },

  getVisibleRequests(userEmail, includeHidden = false) {
    const all = this.getRequests(userEmail);
    if (includeHidden) return all;
    const hiddenIds = new Set(this.getCustomerHiddenIds(userEmail));
    return all.filter((r) => !hiddenIds.has(r.id));
  },

  getHiddenRequests(userEmail) {
    const all = this.getRequests(userEmail);
    const hiddenIds = new Set(this.getCustomerHiddenIds(userEmail));
    return all.filter((r) => hiddenIds.has(r.id));
  },

  // ── Centre History Visibility Management (Scoped Strictly to Centre ID) ──

  getCentreHiddenIds(centreId) {
    if (!centreId) return [];
    try {
      const raw = localStorage.getItem(`${CENTRE_HIDDEN_PREFIX}${centreId}`);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[storageService] Failed to read hidden requests for centre', e);
      return [];
    }
  },

  saveCentreHiddenIds(centreId, ids) {
    if (!centreId) return [];
    try {
      const uniqueIds = Array.from(new Set(ids));
      localStorage.setItem(`${CENTRE_HIDDEN_PREFIX}${centreId}`, JSON.stringify(uniqueIds));
      dispatchStorageEvent();
      return uniqueIds;
    } catch (e) {
      console.error('[storageService] Failed to save centre hidden IDs', e);
      return [];
    }
  },

  hideCentreRequest(centreId, requestId) {
    if (!centreId || !requestId) return;
    const req = this.getRequestById(requestId);
    if (!req) throw new Error('Transaction record not found.');
    if (centreId && req.centreId && req.centreId !== centreId) {
      throw new Error('Access denied: You can only hide requests assigned to your facility.');
    }
    if (!isEligibleForHistoryHiding(req.status)) {
      throw new Error(`Operational requests with status "${req.status}" cannot be hidden from facility view.`);
    }
    const current = this.getCentreHiddenIds(centreId);
    if (!current.includes(requestId)) {
      return this.saveCentreHiddenIds(centreId, [...current, requestId]);
    }
    return current;
  },

  hideCentreRequests(centreId, requestIds = []) {
    if (!centreId || !Array.isArray(requestIds) || requestIds.length === 0) return [];
    const all = this.getRequestsForCentre(centreId);
    const eligibleIds = requestIds.filter((id) => {
      const req = all.find((r) => r.id === id);
      return req && isEligibleForHistoryHiding(req.status);
    });
    const current = this.getCentreHiddenIds(centreId);
    return this.saveCentreHiddenIds(centreId, [...current, ...eligibleIds]);
  },

  clearCentreHistory(centreId) {
    if (!centreId) return [];
    const centreRequests = this.getRequestsForCentre(centreId);
    // Only hide eligible historical requests; strictly keep active/operational requests visible
    const eligibleHistorical = centreRequests.filter((r) => isEligibleForHistoryHiding(r.status));
    const eligibleIds = eligibleHistorical.map((r) => r.id);
    const current = this.getCentreHiddenIds(centreId);
    return this.saveCentreHiddenIds(centreId, [...current, ...eligibleIds]);
  },

  restoreCentreRequest(centreId, requestId) {
    if (!centreId || !requestId) return;
    const current = this.getCentreHiddenIds(centreId);
    const updated = current.filter((id) => id !== requestId);
    return this.saveCentreHiddenIds(centreId, updated);
  },

  restoreCentreRequests(centreId, requestIds = []) {
    if (!centreId || !Array.isArray(requestIds)) return;
    const toRestore = new Set(requestIds);
    const current = this.getCentreHiddenIds(centreId);
    const updated = current.filter((id) => !toRestore.has(id));
    return this.saveCentreHiddenIds(centreId, updated);
  },

  restoreAllCentreHistory(centreId) {
    if (!centreId) return;
    try {
      localStorage.removeItem(`${CENTRE_HIDDEN_PREFIX}${centreId}`);
      dispatchStorageEvent();
    } catch (e) {}
  },

  isCentreRequestHidden(centreId, requestId) {
    if (!centreId || !requestId) return false;
    const hidden = this.getCentreHiddenIds(centreId);
    return hidden.includes(requestId);
  },

  getVisibleRequestsForCentre(centreId, includeHidden = false) {
    const all = this.getRequestsForCentre(centreId);
    if (includeHidden) return all;
    const hiddenIds = new Set(this.getCentreHiddenIds(centreId));
    return all.filter((r) => !hiddenIds.has(r.id));
  },

  getHiddenRequestsForCentre(centreId) {
    const all = this.getRequestsForCentre(centreId);
    const hiddenIds = new Set(this.getCentreHiddenIds(centreId));
    return all.filter((r) => hiddenIds.has(r.id));
  },

  // ── Recycling Centre Interface Methods ──

  getRequestsForCentre(centreId) {
    if (!centreId) return [];
    const all = this.getAllRequests();
    return all.filter((r) => {
      if (r.centreId && r.centreId === centreId) return true;
      const targetName = resolveCentreName(centreId);
      return targetName && (r.center || '').toLowerCase() === targetName.toLowerCase();
    });
  },

  acceptRequest(requestId, centreId, note = '') {
    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];
    if (req.centreId && req.centreId !== centreId) {
      throw new Error(`Unauthorized: Request #${requestId} is assigned to another recycling facility.`);
    }
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const centreName = resolveCentreName(centreId);
    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: note || `Request accepted by ${centreName}. Processing pipeline allocated.`,
      actor: 'Centre Staff',
    };

    const updatedRecord = {
      ...req,
      status: 'Accepted',
      currentStep: STATUS_STEP_MAP['Accepted'],
      centreId: centreId,
      updatedAt: new Date().toISOString(),
      history: [...(req.history || []), historyEntry],
    };

    currentList[targetIdx] = updatedRecord;
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  rejectRequest(requestId, centreId, reason) {
    if (!reason || reason.trim().length < 3) {
      throw new Error('A valid rejection reason is required (at least 3 characters).');
    }

    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];
    if (req.centreId && req.centreId !== centreId) {
      throw new Error(`Unauthorized: Request #${requestId} is assigned to another recycling facility.`);
    }
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const centreName = resolveCentreName(centreId);
    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: `Request rejected by ${centreName}. Reason: "${reason.trim()}". Processing capacity released.`,
      actor: 'Centre Staff',
    };

    const updatedRecord = {
      ...req,
      status: 'Rejected',
      currentStep: -1,
      rejectionReason: reason.trim(),
      updatedAt: new Date().toISOString(),
      history: [...(req.history || []), historyEntry],
    };

    currentList[targetIdx] = updatedRecord;
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  updateRequestStatusByCentre(requestId, centreId, newStatus, customNote = '') {
    if (!requestId) {
      throw new Error('Request ID is required.');
    }
    if (!centreId) {
      throw new Error('Facility ID is required.');
    }
    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];
    if (req.centreId && req.centreId !== centreId) {
      throw new Error(`Unauthorized: Request #${requestId} is assigned to another recycling facility.`);
    }

    // Idempotency: If request already has this target status, return existing record
    if (req.status === newStatus) {
      return req;
    }

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const centreName = resolveCentreName(centreId);
    const stepIndex = STATUS_STEP_MAP[newStatus] ?? req.currentStep ?? 0;
    const defaultNote =
      newStatus === 'Received'
        ? `Hardware physically received and inspected at ${centreName}. Chain-of-custody confirmed.`
        : `Status updated to ${newStatus} by ${centreName}.`;

    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: customNote || defaultNote,
      actor: 'Centre Staff',
    };

    const existingHistory = Array.isArray(req.history) ? req.history : [];

    const updatedRecord = {
      ...req,
      status: newStatus,
      currentStep: stepIndex,
      updatedAt: new Date().toISOString(),
      history: [...existingHistory, historyEntry],
    };

    if (!updatedRecord.centreId) {
      updatedRecord.centreId = centreId;
    }

    currentList[targetIdx] = updatedRecord;
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  getCentreAvailability(centreId, requestOrCriteria = {}, daysAhead = 14, excludeRequestIdOrRefDate = null, refDate = null) {
    const centre = this.getCentreById(centreId);
    if (!centre) {
      return {
        availableDays: [],
        error: 'Facility not found',
        centre: null,
      };
    }

    let excludeRequestIdParam = null;
    let referenceDate = null;

    if (
      excludeRequestIdOrRefDate instanceof Date ||
      (typeof excludeRequestIdOrRefDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(excludeRequestIdOrRefDate))
    ) {
      referenceDate = excludeRequestIdOrRefDate;
    } else if (typeof excludeRequestIdOrRefDate === 'string') {
      excludeRequestIdParam = excludeRequestIdOrRefDate;
      referenceDate = refDate;
    } else if (refDate) {
      referenceDate = refDate;
    }

    let reqWeight = 0;
    let reqQuantity = 1;
    let reqMethod = 'dropoff';
    let excludeRequestId = excludeRequestIdParam;

    if (typeof requestOrCriteria === 'string') {
      const all = this.getAllRequests();
      const found = all.find((r) => r.id === requestOrCriteria);
      if (found) {
        reqWeight = Number(found.weight) || 0;
        reqQuantity = Number(found.quantity) || 1;
        reqMethod = found.method || 'dropoff';
        if (!excludeRequestId) excludeRequestId = found.id;
      }
    } else if (typeof requestOrCriteria === 'object' && requestOrCriteria !== null) {
      if (requestOrCriteria.id && !excludeRequestId) excludeRequestId = requestOrCriteria.id;
      reqWeight = Number(requestOrCriteria.weight) || 0;
      reqQuantity = Number(requestOrCriteria.quantity) || 1;
      reqMethod = requestOrCriteria.method || 'dropoff';
    }

    const serviceSupported =
      (reqMethod === 'pickup' && centre.pickupAvailable) ||
      (reqMethod === 'dropoff' && centre.dropoffAvailable);

    const leadTimeDays = Number(centre.leadTimeDays) || 2;
    const activeDays = getActiveDaysCount(centre);

    const maxWeeklyKg = Number(centre.maxWeeklyCapacityKg);
    const validMaxWeeklyKg = !isNaN(maxWeeklyKg) && maxWeeklyKg > 0 ? maxWeeklyKg : 3000;
    const maxWeeklyUnits = Number(centre.maxWeeklyUnits) || 800;

    const dailyMaxKg = Math.ceil(validMaxWeeklyKg / activeDays);
    const dailyMaxUnits = Math.ceil(maxWeeklyUnits / activeDays);

    const numSlots = STANDARD_SLOTS.length;
    const configuredSlotLimitKg = Number(centre.slotLimitKg);
    const slotMaxKg = !isNaN(configuredSlotLimitKg) && configuredSlotLimitKg > 0
      ? configuredSlotLimitKg
      : Math.ceil(dailyMaxKg / numSlots);
    const slotMaxUnits = Math.ceil(dailyMaxUnits / numSlots);

    // Active requests consuming appointment capacity for this centre
    const centreRequests = this.getRequestsForCentre(centreId);
    const activeBookings = centreRequests.filter(
      (r) =>
        r.id !== excludeRequestId &&
        ['Scheduled', 'In Transit', 'Received', 'Processing', 'Reschedule Requested'].includes(r.status) &&
        r.appointment?.date
    );

    const weekBookings = {};
    const dayBookings = {};
    const slotBookings = {};

    activeBookings.forEach((r) => {
      const d = r.appointment.date;
      const s = r.appointment.timeSlot || r.appointment.timeWindow;
      const w = Number(r.weight) || 0;
      const q = Number(r.quantity) || 1;

      const wKey = getWeekKey(d);
      if (!weekBookings[wKey]) weekBookings[wKey] = { weight: 0, quantity: 0 };
      weekBookings[wKey].weight += w;
      weekBookings[wKey].quantity += q;

      if (!dayBookings[d]) dayBookings[d] = { weight: 0, quantity: 0 };
      dayBookings[d].weight += w;
      dayBookings[d].quantity += q;

      if (s) {
        if (!slotBookings[d]) slotBookings[d] = {};
        if (!slotBookings[d][s]) slotBookings[d][s] = { weight: 0, quantity: 0 };
        slotBookings[d][s].weight += w;
        slotBookings[d][s].quantity += q;
      }
    });

    const today = referenceDate && !isNaN(new Date(referenceDate).getTime())
      ? new Date(referenceDate)
      : new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatLocalDate(today);

    // Calculate advance lead time using facility OPERATING DAYS (not raw calendar days)
    let opDaysCounted = 0;
    const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let safetyGuard = 60;
    while (opDaysCounted < leadTimeDays && safetyGuard-- > 0) {
      checkDate.setDate(checkDate.getDate() + 1);
      const dayOfWeek = checkDate.getDay();
      if (isOperatingDay(centre, dayOfWeek)) {
        opDaysCounted++;
      }
    }
    const earliestAllowedStr = formatLocalDate(checkDate);

    const daysList = [];

    for (let offset = 0; offset < daysAhead; offset++) {
      const curr = new Date(today);
      curr.setDate(curr.getDate() + offset);
      const dateStr = formatLocalDate(curr);
      const dayOfWeek = curr.getDay();
      const isToday = dateStr === todayStr;
      const isPastOrLeadTime = dateStr < earliestAllowedStr;
      const isOpenDay = isOperatingDay(centre, dayOfWeek);

      const dayName = curr.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = curr.toLocaleDateString('en-US', { month: 'short' });
      const dayNumber = curr.getDate();

      const weekKey = getWeekKey(dateStr);
      const bookedWeek = weekBookings[weekKey] || { weight: 0, quantity: 0 };
      const remainingWeekKg = Math.max(0, validMaxWeeklyKg - bookedWeek.weight);
      const remainingWeekUnits = Math.max(0, maxWeeklyUnits - bookedWeek.quantity);
      const weekCanFit = reqWeight <= remainingWeekKg && reqQuantity <= remainingWeekUnits;

      const bookedDay = dayBookings[dateStr] || { weight: 0, quantity: 0 };
      const remainingDayKg = Math.max(0, dailyMaxKg - bookedDay.weight);
      const remainingDayUnits = Math.max(0, dailyMaxUnits - bookedDay.quantity);

      const dayCanFit =
        reqWeight <= remainingDayKg && reqQuantity <= remainingDayUnits;

      const slots = STANDARD_SLOTS.map((slotTime) => {
        const bookedSlot =
          slotBookings[dateStr] && slotBookings[dateStr][slotTime]
            ? slotBookings[dateStr][slotTime]
            : { weight: 0, quantity: 0 };

        const remainingSlotKg = Math.max(0, slotMaxKg - bookedSlot.weight);
        const remainingSlotUnits = Math.max(0, slotMaxUnits - bookedSlot.quantity);

        let slotAvailable = true;
        let slotReason = '';

        const { startTime: slotStart } = parseSlotTimeRange(slotTime);
        const centreOpen = centre.openingTime || '09:00';
        const centreClose = centre.closingTime || '17:00';
        const isOutsideOperatingHours = slotStart < centreOpen || slotStart >= centreClose;

        if (!serviceSupported) {
          slotAvailable = false;
          slotReason = `Facility does not support ${reqMethod} service`;
        } else if (isPastOrLeadTime) {
          slotAvailable = false;
          slotReason = isToday
            ? 'Today (Lead time required)'
            : `Requires ${leadTimeDays}-day advance lead time`;
        } else if (!isOpenDay) {
          slotAvailable = false;
          slotReason = 'Facility closed';
        } else if (isOutsideOperatingHours) {
          slotAvailable = false;
          slotReason = `Outside operating hours (${centre.hours || formatOperatingHours(centreOpen, centreClose)})`;
        } else if (!weekCanFit) {
          slotAvailable = false;
          slotReason = `Weekly capacity limit reached: ${remainingWeekKg.toFixed(2)} kg remaining (needs ${reqWeight} kg)`;
        } else if (!dayCanFit) {
          slotAvailable = false;
          slotReason = `Daily facility intake capacity exhausted: ${remainingDayKg.toFixed(2)} kg remaining (needs ${reqWeight} kg)`;
        } else if (reqWeight > remainingSlotKg) {
          slotAvailable = false;
          slotReason = `Capacity limit exceeded: ${remainingSlotKg.toFixed(2)} kg remaining (needs ${reqWeight} kg)`;
        } else if (reqQuantity > remainingSlotUnits) {
          slotAvailable = false;
          slotReason = `Slot unit limit exceeded: ${remainingSlotUnits} units remaining (needs ${reqQuantity})`;
        }

        return {
          timeSlot: slotTime,
          available: slotAvailable,
          reason: slotReason,
          remainingSlotKg: Number(remainingSlotKg.toFixed(2)),
          remainingSlotUnits,
          slotMaxKg,
          slotMaxUnits,
          bookedSlotKg: Number(bookedSlot.weight.toFixed(2)),
          bookedSlotUnits: bookedSlot.quantity,
          remainingDayKg: Number(remainingDayKg.toFixed(2)),
          remainingWeekKg: Number(remainingWeekKg.toFixed(2)),
        };
      });

      const hasAnyAvailableSlot = slots.some((s) => s.available);

      let dayReason = '';
      if (!serviceSupported) {
        dayReason = `Facility does not offer ${reqMethod}`;
      } else if (isPastOrLeadTime) {
        dayReason = isToday
          ? 'Today (Advance notice required)'
          : `Within ${leadTimeDays}-day scheduling lead time`;
      } else if (!isOpenDay) {
        dayReason = 'Closed on this day';
      } else if (!weekCanFit) {
        dayReason = 'Weekly facility capacity fully booked';
      } else if (!dayCanFit) {
        dayReason = 'Daily processing capacity fully booked';
      } else if (!hasAnyAvailableSlot) {
        dayReason = 'All time slots at capacity';
      }

      daysList.push({
        date: dateStr,
        dayName,
        monthName,
        dayNumber,
        isToday,
        isOpenDay,
        isPastOrLeadTime,
        isAvailable: hasAnyAvailableSlot,
        reason: dayReason,
        slots,
        remainingDayKg: Number(remainingDayKg.toFixed(2)),
        remainingDayUnits,
        remainingWeekKg: Number(remainingWeekKg.toFixed(2)),
        dailyMaxKg,
        dailyMaxUnits,
      });
    }

    return {
      centre,
      leadTimeDays,
      dailyMaxKg,
      dailyMaxUnits,
      slotMaxKg,
      slotMaxUnits,
      serviceSupported,
      availableDays: daysList,
    };
  },

  bookAppointment(requestId, centreId, appointmentData) {
    if (!appointmentData.date) {
      throw new Error('Appointment date is required.');
    }
    if (!appointmentData.timeSlot) {
      throw new Error('Appointment time slot is required.');
    }

    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];
    if (req.centreId && req.centreId !== centreId) {
      throw new Error(`Unauthorized: Request #${requestId} is assigned to another recycling facility.`);
    }
    const reqWeight = Number(req.weight);
    if (isNaN(reqWeight) || reqWeight <= 0) {
      throw new Error(`Cannot book appointment: Request #${requestId} has an invalid hardware weight (${req.weight}).`);
    }

    // Atomic availability validation to prevent overbooking
    const targetDate = new Date(appointmentData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let refDate = appointmentData.referenceDate || null;
    if (!refDate && !isNaN(targetDate.getTime()) && targetDate < today) {
      const simulatedRef = new Date(targetDate);
      simulatedRef.setDate(simulatedRef.getDate() - 7);
      refDate = formatLocalDate(simulatedRef);
    }
    const diffDays = !isNaN(targetDate.getTime()) && targetDate >= today
      ? Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 7
      : 21;
    const daysWindow = Math.max(21, diffDays);

    const availability = this.getCentreAvailability(centreId, req, daysWindow, null, refDate);
    const targetDay = availability.availableDays.find((d) => d.date === appointmentData.date);

    if (!targetDay || !targetDay.isAvailable) {
      throw new Error(
        `Date ${appointmentData.date} cannot accommodate this request: ${
          targetDay?.reason || 'Capacity limit reached.'
        }`
      );
    }

    const targetSlot = targetDay.slots.find((s) => s.timeSlot === appointmentData.timeSlot);
    if (!targetSlot || !targetSlot.available) {
      throw new Error(
        `Time slot ${appointmentData.timeSlot} on ${appointmentData.date} is unavailable: ${
          targetSlot?.reason || 'Capacity exhausted.'
        }`
      );
    }

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const centreName = resolveCentreName(centreId);
    const bookingRef = `APT-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;

    const appointmentRecord = {
      bookingRef,
      type: req.method || 'dropoff',
      date: appointmentData.date,
      timeSlot: appointmentData.timeSlot,
      timeWindow: appointmentData.timeSlot,
      instructions: appointmentData.instructions?.trim() || '',
      pickupAddress:
        req.method === 'pickup'
          ? (appointmentData.pickupAddress?.trim() || req.address)
          : null,
      status: 'confirmed',
      bookedAt: new Date().toISOString(),
      bookedBy: appointmentData.staffName || centreName,
    };

    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: `Appointment confirmed for ${appointmentData.date} (${appointmentData.timeSlot}) [Ref: ${bookingRef}]. Capacity reserved by ${centreName}.`,
      actor: 'Centre Staff',
    };

    const updatedRecord = {
      ...req,
      status: 'Scheduled',
      currentStep: getStepIndex('Scheduled', req.method),
      centreId: centreId,
      center: centreName,
      appointment: appointmentRecord,
      updatedAt: new Date().toISOString(),
      history: [...(req.history || []), historyEntry],
    };

    currentList[targetIdx] = updatedRecord;
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  rescheduleAppointment(requestId, centreId, appointmentData) {
    if (!appointmentData.date) {
      throw new Error('New appointment date is required.');
    }
    if (!appointmentData.timeSlot) {
      throw new Error('New appointment time slot is required.');
    }

    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];
    if (req.centreId && req.centreId !== centreId) {
      throw new Error(`Unauthorized: Request #${requestId} is assigned to another recycling facility.`);
    }
    const reqWeight = Number(req.weight);
    if (isNaN(reqWeight) || reqWeight <= 0) {
      throw new Error(`Cannot reschedule appointment: Request #${requestId} has an invalid hardware weight (${req.weight}).`);
    }

    // Revalidate availability excluding the existing booking for this request
    const targetDate = new Date(appointmentData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let refDate = appointmentData.referenceDate || null;
    if (!refDate && !isNaN(targetDate.getTime()) && targetDate < today) {
      const simulatedRef = new Date(targetDate);
      simulatedRef.setDate(simulatedRef.getDate() - 7);
      refDate = formatLocalDate(simulatedRef);
    }
    const diffDays = !isNaN(targetDate.getTime()) && targetDate >= today
      ? Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 7
      : 21;
    const daysWindow = Math.max(21, diffDays);

    const availability = this.getCentreAvailability(centreId, req, daysWindow, requestId, refDate);
    const targetDay = availability.availableDays.find((d) => d.date === appointmentData.date);

    if (!targetDay || !targetDay.isAvailable) {
      throw new Error(
        `Date ${appointmentData.date} cannot accommodate this request: ${
          targetDay?.reason || 'Capacity limit reached.'
        }`
      );
    }

    const targetSlot = targetDay.slots.find((s) => s.timeSlot === appointmentData.timeSlot);
    if (!targetSlot || !targetSlot.available) {
      throw new Error(
        `Time slot ${appointmentData.timeSlot} on ${appointmentData.date} is unavailable: ${
          targetSlot?.reason || 'Capacity exhausted.'
        }`
      );
    }

    const oldDate = req.appointment?.date || 'previous date';
    const oldSlot = req.appointment?.timeSlot || req.appointment?.timeWindow || '';

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const centreName = resolveCentreName(centreId);
    const bookingRef =
      req.appointment?.bookingRef ||
      `APT-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;

    const appointmentRecord = {
      ...(req.appointment || {}),
      bookingRef,
      date: appointmentData.date,
      timeSlot: appointmentData.timeSlot,
      timeWindow: appointmentData.timeSlot,
      instructions:
        appointmentData.instructions !== undefined
          ? appointmentData.instructions.trim()
          : req.appointment?.instructions || '',
      pickupAddress:
        req.method === 'pickup'
          ? (appointmentData.pickupAddress?.trim() || req.appointment?.pickupAddress || req.address)
          : null,
      status: 'confirmed',
      customerNote: null,
      rescheduledAt: new Date().toISOString(),
      rescheduledBy: appointmentData.staffName || centreName,
    };

    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: `Appointment rescheduled from ${oldDate} (${oldSlot}) to ${appointmentData.date} (${appointmentData.timeSlot}). Capacity re-allocated.`,
      actor: 'Centre Staff',
    };

    const updatedRecord = {
      ...req,
      status: 'Scheduled',
      currentStep: getStepIndex('Scheduled', req.method),
      appointment: appointmentRecord,
      updatedAt: new Date().toISOString(),
      history: [...(req.history || []), historyEntry],
    };

    currentList[targetIdx] = updatedRecord;
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  cancelRequestByCustomer(requestId, userEmail, reason = '') {
    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];

    if (
      userEmail &&
      req.userEmail &&
      req.userEmail.toLowerCase() !== userEmail.trim().toLowerCase()
    ) {
      throw new Error('Unauthorized: You can only cancel requests submitted by your account.');
    }

    if (!['Submitted', 'Scheduled', 'Accepted', 'Schedule Proposed'].includes(req.status)) {
      if (
        ['In Transit', 'Received', 'Processing', 'Completed', 'Recycled', 'Drop-off Completed'].includes(
          req.status
        )
      ) {
        throw new Error(
          'Requests cannot be cancelled once collection, transit, or processing has commenced.'
        );
      }
      if (['Cancelled', 'Rejected'].includes(req.status)) {
        throw new Error(`This request is already ${req.status.toLowerCase()}.`);
      }
    }

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const cancellationReason = reason?.trim() || 'Cancelled by customer';
    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: `Request cancelled by customer. Reason: "${cancellationReason}". Reserved capacity released.`,
      actor: 'Customer',
    };

    const updatedRecord = {
      ...req,
      status: 'Cancelled',
      currentStep: -1,
      cancellationReason,
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [...(req.history || []), historyEntry],
    };

    currentList[targetIdx] = updatedRecord;
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  proposeAppointment(requestId, centreId, appointmentData) {
    if (!appointmentData.date) {
      throw new Error('Appointment date is required.');
    }
    if (!appointmentData.timeWindow) {
      throw new Error('Time window or time slot is required.');
    }

    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];
    if (req.centreId && req.centreId !== centreId) {
      throw new Error(`Unauthorized: Request #${requestId} is assigned to another recycling facility.`);
    }
    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const appointmentRecord = {
      type: appointmentData.type || req.method || 'dropoff',
      date: appointmentData.date,
      timeWindow: appointmentData.timeWindow,
      instructions: appointmentData.instructions?.trim() || '',
      pickupAddress:
        req.method === 'pickup'
          ? (appointmentData.pickupAddress || req.address)
          : null,
      status: 'proposed',
      proposedAt: new Date().toISOString(),
      proposedBy: resolveCentreName(centreId),
    };

    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: `Appointment proposed for ${appointmentData.date} (${appointmentData.timeWindow}). Awaiting customer confirmation.`,
      actor: 'Centre Staff',
    };

    const updatedRecord = {
      ...req,
      status: 'Schedule Proposed',
      currentStep: STATUS_STEP_MAP['Schedule Proposed'],
      appointment: appointmentRecord,
      updatedAt: new Date().toISOString(),
      history: [...(req.history || []), historyEntry],
    };

    currentList[targetIdx] = updatedRecord;
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  updateCentreLifecycleStatus(requestId, centreId, newStatus, customNote = '') {
    const currentList = this.getAllRequests();
    const targetIdx = currentList.findIndex((r) => r.id === requestId);

    if (targetIdx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[targetIdx];

    // Prevent invalid transitions: Drop-off requests must not be set to "In Transit"
    if (req.method === 'dropoff' && newStatus === 'In Transit') {
      throw new Error(
        'Drop-off requests do not enter "In Transit". Transition directly to "Received" when customer delivers hardware.'
      );
    }

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: customNote || `Operational status transitioned to ${newStatus}`,
      actor: 'Centre Staff',
    };

    const updatedRecord = {
      ...req,
      status: newStatus,
      currentStep: getStepIndex(newStatus, req.method),
      updatedAt: new Date().toISOString(),
      history: [...(req.history || []), historyEntry],
    };

    currentList[targetIdx] = updatedRecord;
    this.saveMasterRequests(currentList);
    return updatedRecord;
  },

  // ── Centre Registry & Registration (Zero Demo Data Architecture) ──

  getCentres() {
    try {
      const raw = localStorage.getItem(CENTRES_DATA_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      // Clean out any legacy demo/seed facilities so registry contains only genuine registered centres
      const realCentres = parsed.filter(
        (c) =>
          !DEMO_CENTRE_IDS.has(c.id) &&
          !DEMO_CENTRE_NAMES.has((c.name || '').trim().toLowerCase())
      );

      // If demo entries were purged, update localStorage
      if (realCentres.length !== parsed.length) {
        localStorage.setItem(CENTRES_DATA_KEY, JSON.stringify(realCentres));
      }

      // Enrich centres with structured schedule fields if missing
      return realCentres.map((c) => {
        const operatingDaysList =
          Array.isArray(c.operatingDaysList) && c.operatingDaysList.length > 0
            ? c.operatingDaysList
            : parseOperatingDays(c.operatingDays);
        const { openingTime: defaultOpen, closingTime: defaultClose } = parseOperatingHours(c.hours);
        const openingTime = c.openingTime || defaultOpen || '09:00';
        const closingTime = c.closingTime || defaultClose || '17:00';
        const operatingDays = c.operatingDays || formatOperatingDays(operatingDaysList);
        const hours = c.hours || formatOperatingHours(openingTime, closingTime);
        return {
          ...c,
          operatingDaysList,
          openingTime,
          closingTime,
          operatingDays,
          hours,
        };
      });
    } catch {
      return [];
    }
  },

  getCentreById(centreId) {
    if (!centreId) return null;
    const centres = this.getCentres();
    return centres.find((c) => c.id === centreId) || null;
  },

  registerCentre(centreData) {
    if (!centreData.name || centreData.name.trim().length < 2) {
      throw new Error('Facility name is required.');
    }
    if (!centreData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(centreData.email.trim())) {
      throw new Error('A valid official contact email address is required.');
    }
    if (!centreData.phone || centreData.phone.trim().length < 5) {
      throw new Error('Contact phone number is required.');
    }
    if (!centreData.address || centreData.address.trim().length < 3) {
      throw new Error('Facility physical street address is required.');
    }
    if (!centreData.city || centreData.city.trim().length < 2) {
      throw new Error('City or service area is required.');
    }
    if (!centreData.password || centreData.password.length < 4) {
      throw new Error('Password must be at least 4 characters.');
    }

    const normalizedEmail = centreData.email.trim().toLowerCase();
    const existing = this.getCentres();

    if (existing.some((c) => (c.email || '').toLowerCase() === normalizedEmail)) {
      throw new Error('A recycling facility with this contact email already exists.');
    }

    const daysList =
      centreData.operatingDaysList !== undefined
        ? (Array.isArray(centreData.operatingDaysList) ? centreData.operatingDaysList : parseOperatingDays(centreData.operatingDaysList))
        : parseOperatingDays(centreData.operatingDays);

    let openTime = centreData.openingTime;
    let closeTime = centreData.closingTime;
    if (!openTime || !closeTime) {
      const parsedHours = parseOperatingHours(centreData.hours);
      openTime = openTime || parsedHours.openingTime;
      closeTime = closeTime || parsedHours.closingTime;
    }

    const scheduleValidation = validateSchedule({
      operatingDaysList: daysList,
      openingTime: openTime,
      closingTime: closeTime,
    });
    if (!scheduleValidation.isValid) {
      throw new Error(scheduleValidation.error);
    }

    const operatingDays = centreData.operatingDays || formatOperatingDays(daysList);
    const hours = centreData.hours || formatOperatingHours(openTime, closeTime);

    const uniqueId = `CTR-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;

    const newCentre = {
      id: uniqueId,
      name: centreData.name.trim(),
      email: normalizedEmail,
      phone: centreData.phone.trim(),
      address: centreData.address.trim(),
      city: centreData.city.trim(),
      serviceArea: centreData.serviceArea?.trim() || centreData.city.trim(),
      accepted:
        Array.isArray(centreData.categories) && centreData.categories.length > 0
          ? centreData.categories
          : ['Computers & Laptops', 'Smartphones & Tablets'],
      capabilities:
        centreData.capabilities?.trim() ||
        'Certified Sorting, Mechanical Disassembly & Hazard Depollution',
      maxWeeklyCapacityKg: Number(centreData.maxWeeklyCapacityKg) || 3000,
      maxWeeklyUnits: Number(centreData.maxWeeklyUnits) || 800,
      slotLimitKg: !isNaN(Number(centreData.slotLimitKg)) && Number(centreData.slotLimitKg) > 0 ? Number(centreData.slotLimitKg) : 250,
      pickupAvailable: centreData.pickupAvailable ?? true,
      dropoffAvailable: centreData.dropoffAvailable ?? true,
      operatingDaysList: daysList,
      openingTime: openTime,
      closingTime: closeTime,
      operatingDays,
      hours,
      leadTimeDays: Number(centreData.leadTimeDays) || 2,
      createdAt: new Date().toISOString(),
      coordinates: centreData.coordinates || null,
      password: centreData.password,
    };

    const updated = [...existing, newCentre];
    localStorage.setItem(CENTRES_DATA_KEY, JSON.stringify(updated));
    dispatchStorageEvent();
    return newCentre;
  },

  authenticateCentre(email, password) {
    if (!email || !password) {
      throw new Error('Please provide both facility email and password.');
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.getCentres();
    const found = existing.find((c) => (c.email || '').toLowerCase() === normalizedEmail);

    if (!found) {
      throw new Error('No registered recycling facility found with this email.');
    }

    if (found.password && found.password !== password) {
      throw new Error('Invalid password for this facility account.');
    }

    return found;
  },

  updateCentre(centreId, updates) {
    const centres = this.getCentres();
    const idx = centres.findIndex((c) => c.id === centreId);
    if (idx === -1) throw new Error(`Centre #${centreId} not found.`);

    const currentCentre = centres[idx];
    let finalUpdates = { ...updates };

    // Invalidate stale coordinates if physical address or city changes without new coordinates provided
    if (
      (updates.address !== undefined && updates.address.trim() !== currentCentre.address) ||
      (updates.city !== undefined && updates.city.trim() !== currentCentre.city)
    ) {
      if (updates.coordinates === undefined) {
        finalUpdates.coordinates = null;
      }
    }

    if (
      updates.operatingDaysList !== undefined ||
      updates.openingTime !== undefined ||
      updates.closingTime !== undefined ||
      updates.operatingDays !== undefined ||
      updates.hours !== undefined
    ) {
      const daysList =
        updates.operatingDaysList !== undefined
          ? (Array.isArray(updates.operatingDaysList) ? updates.operatingDaysList : parseOperatingDays(updates.operatingDaysList))
          : (currentCentre.operatingDaysList || parseOperatingDays(currentCentre.operatingDays));

      let openTime = updates.openingTime !== undefined ? updates.openingTime : currentCentre.openingTime;
      let closeTime = updates.closingTime !== undefined ? updates.closingTime : currentCentre.closingTime;

      if (!openTime || !closeTime) {
        const parsedHours = parseOperatingHours(updates.hours || currentCentre.hours);
        openTime = openTime || parsedHours.openingTime;
        closeTime = closeTime || parsedHours.closingTime;
      }

      const scheduleValidation = validateSchedule({
        operatingDaysList: daysList,
        openingTime: openTime,
        closingTime: closeTime,
      });
      if (!scheduleValidation.isValid) {
        throw new Error(scheduleValidation.error);
      }

      finalUpdates.operatingDaysList = daysList;
      finalUpdates.openingTime = openTime;
      finalUpdates.closingTime = closeTime;
      finalUpdates.operatingDays = formatOperatingDays(daysList);
      finalUpdates.hours = formatOperatingHours(openTime, closeTime);
    }

    const updated = { ...currentCentre, ...finalUpdates };
    centres[idx] = updated;
    localStorage.setItem(CENTRES_DATA_KEY, JSON.stringify(centres));
    dispatchStorageEvent();
    return updated;
  },

  verifyCentreCoordinates(centreId, coordinateData) {
    if (!centreId) throw new Error('Centre ID is required.');
    if (!coordinateData) throw new Error('Coordinate data is required.');
    return this.updateCentre(centreId, { coordinates: coordinateData });
  },

  getCentreWorkload(centreId, targetDateStr = null) {
    const centre = this.getCentreById(centreId);
    if (!centre) {
      return {
        activeCount: 0,
        currentWeekBookedKg: 0,
        currentWeekBookedUnits: 0,
        currentWeekBookedCount: 0,
        totalAllocatedKg: 0,
        totalAllocatedUnits: 0,
        completedCount: 0,
        unassignedCount: 0,
        unassignedKg: 0,
        unassignedUnits: 0,
        lifetimeActiveCount: 0,
        lifetimeActiveKg: 0,
        lifetimeActiveUnits: 0,
        capacityKg: 3000,
        capacityUnits: 800,
        percentKg: 0,
        percentUnits: 0,
        isNearCapacity: false,
      };
    }

    const requests = this.getRequestsForCentre(centreId);

    // Strictly exclude Cancelled and Rejected declarations from operational workload
    const validRequests = requests.filter(
      (r) => !['Rejected', 'Cancelled'].includes(r.status)
    );

    // Weekly boundary: Monday-to-Sunday via getWeekKey
    const refDateStr = targetDateStr || formatLocalDate(new Date());
    const currentWeekKey = getWeekKey(refDateStr);

    // Lifetime active pipeline (requests currently in flight: Submitted, Accepted, Proposed, Scheduled, In Transit, Received, Processing)
    const lifetimeActiveRequests = validRequests.filter(
      (r) => !['Recycled', 'Completed'].includes(r.status)
    );
    const lifetimeActiveKg = Number(
      lifetimeActiveRequests
        .reduce((sum, r) => sum + (Number(r.weight) || 0), 0)
        .toFixed(2)
    );
    const lifetimeActiveUnits = lifetimeActiveRequests.reduce(
      (sum, r) => sum + (Number(r.quantity) || 1),
      0
    );

    // Current week appointment allocation: requests with confirmed appointment dates falling in the target week
    const currentWeekBookedRequests = lifetimeActiveRequests.filter((r) => {
      if (!r.appointment || !r.appointment.date) return false;
      return getWeekKey(r.appointment.date) === currentWeekKey;
    });

    const currentWeekBookedKg = Number(
      currentWeekBookedRequests
        .reduce((sum, r) => sum + (Number(r.weight) || 0), 0)
        .toFixed(2)
    );
    const currentWeekBookedUnits = currentWeekBookedRequests.reduce(
      (sum, r) => sum + (Number(r.quantity) || 1),
      0
    );

    // Unassigned intake pipeline: active requests awaiting appointment booking / proposal
    const unassignedRequests = lifetimeActiveRequests.filter(
      (r) => !r.appointment || !r.appointment.date
    );
    const unassignedKg = Number(
      unassignedRequests
        .reduce((sum, r) => sum + (Number(r.weight) || 0), 0)
        .toFixed(2)
    );
    const unassignedUnits = unassignedRequests.reduce(
      (sum, r) => sum + (Number(r.quantity) || 1),
      0
    );

    const completedCount = validRequests.filter((r) =>
      ['Recycled', 'Completed'].includes(r.status)
    ).length;

    const capacityKg = centre.maxWeeklyCapacityKg || 3000;
    const capacityUnits = centre.maxWeeklyUnits || 800;

    const percentKg = Math.min(100, Math.round((currentWeekBookedKg / capacityKg) * 100));
    const percentUnits = Math.min(100, Math.round((currentWeekBookedUnits / capacityUnits) * 100));

    return {
      currentWeekKey,
      currentWeekBookedKg,
      currentWeekBookedUnits,
      currentWeekBookedCount: currentWeekBookedRequests.length,

      // Weekly allocation (backwards-compatible alias for existing UI)
      totalAllocatedKg: currentWeekBookedKg,
      totalAllocatedUnits: currentWeekBookedUnits,

      // Unassigned intake pipeline
      unassignedCount: unassignedRequests.length,
      unassignedKg,
      unassignedUnits,

      // Lifetime active totals
      lifetimeActiveCount: lifetimeActiveRequests.length,
      lifetimeActiveKg,
      lifetimeActiveUnits,
      activeCount: lifetimeActiveRequests.length,

      // Terminal historical counts
      completedCount,
      cancelledCount: requests.filter((r) => r.status === 'Cancelled').length,
      rejectedCount: requests.filter((r) => r.status === 'Rejected').length,

      // Capacities & thresholds
      capacityKg,
      capacityUnits,
      percentKg,
      percentUnits,
      isNearCapacity: percentKg >= 85 || percentUnits >= 85,
    };
  },

  validateServiceArea(centre, address) {
    return validateServiceArea(centre, address);
  },

  getRequestDisplayAddress(request, centres = null) {
    return getRequestDisplayAddress(request, centres);
  },

  validateRequestFeasibility(centreId, requestData) {
    const centre = this.getCentreById(centreId);
    if (!centre) {
      return { feasible: false, reason: 'Recycling facility not found.' };
    }
    return checkRequestFeasibility(centre, {
      weight: requestData.weight,
      quantity: requestData.quantity !== undefined ? requestData.quantity : requestData.itemCount,
    });
  },

  // ==========================================
  // CUSTOMER ADDRESS BOOK & PICKUP DETAILS
  // ==========================================

  getUserAddresses(userEmail) {
    if (!userEmail) return [];
    const normalized = userEmail.trim().toLowerCase();
    try {
      const data = localStorage.getItem(`ecocycle_addresses_${normalized}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveUserAddress(userEmail, addressData) {
    if (!userEmail) throw new Error('User email is required.');
    if (!addressData.addressLine?.trim()) {
      throw new Error('Address line is required.');
    }
    if (!addressData.city?.trim()) {
      throw new Error('City is required.');
    }

    const normalized = userEmail.trim().toLowerCase();
    const existing = this.getUserAddresses(normalized);

    const isFirstAddress = existing.length === 0;
    const shouldBeDefault = addressData.isDefault ?? isFirstAddress;

    let updatedList;
    let savedRecord;

    if (addressData.id) {
      // Editing existing address
      const idx = existing.findIndex((a) => a.id === addressData.id);
      if (idx === -1) throw new Error('Address record not found.');

      const prev = existing[idx];
      const addressLineChanged = prev.addressLine !== addressData.addressLine.trim();
      const cityChanged = prev.city !== addressData.city.trim();

      let coordsToSave = prev.coordinates || null;
      if (addressData.coordinates !== undefined) {
        coordsToSave = addressData.coordinates;
      } else if (addressLineChanged || cityChanged) {
        coordsToSave = null; // Stale coordinates invalidated on text change
      }

      savedRecord = {
        ...prev,
        label: addressData.label?.trim() || addressData.name?.trim() || 'Saved Address',
        addressLine: addressData.addressLine.trim(),
        city: addressData.city.trim(),
        state: addressData.state?.trim() || '',
        postalCode: addressData.postalCode?.trim() || '',
        pickupInstructions: addressData.pickupInstructions?.trim() || '',
        isDefault: shouldBeDefault,
        coordinates: coordsToSave,
        updatedAt: new Date().toISOString(),
      };

      updatedList = existing.map((a, i) => {
        if (i === idx) return savedRecord;
        if (shouldBeDefault) return { ...a, isDefault: false };
        return a;
      });
    } else {
      // New address
      const newId = `ADDR-${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
      savedRecord = {
        id: newId,
        label: addressData.label?.trim() || addressData.name?.trim() || 'Home',
        addressLine: addressData.addressLine.trim(),
        city: addressData.city.trim(),
        state: addressData.state?.trim() || '',
        postalCode: addressData.postalCode?.trim() || '',
        pickupInstructions: addressData.pickupInstructions?.trim() || '',
        isDefault: shouldBeDefault,
        coordinates: addressData.coordinates || null,
        createdAt: new Date().toISOString(),
      };

      updatedList = shouldBeDefault
        ? [savedRecord, ...existing.map((a) => ({ ...a, isDefault: false }))]
        : [...existing, savedRecord];
    }

    localStorage.setItem(`ecocycle_addresses_${normalized}`, JSON.stringify(updatedList));
    dispatchStorageEvent();
    return savedRecord;
  },

  verifyUserAddress(userEmail, addressId, coordinateData) {
    if (!userEmail) throw new Error('User email is required.');
    if (!addressId) throw new Error('Address ID is required.');
    if (!coordinateData) throw new Error('Coordinate data is required.');

    const normalized = userEmail.trim().toLowerCase();
    const existing = this.getUserAddresses(normalized);
    const idx = existing.findIndex((a) => a.id === addressId);
    if (idx === -1) throw new Error('Address record not found.');

    const updatedRecord = {
      ...existing[idx],
      coordinates: coordinateData,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = existing.map((a, i) => (i === idx ? updatedRecord : a));
    localStorage.setItem(`ecocycle_addresses_${normalized}`, JSON.stringify(updatedList));
    dispatchStorageEvent();
    return updatedRecord;
  },

  deleteUserAddress(userEmail, addressId) {
    if (!userEmail || !addressId) return;
    const normalized = userEmail.trim().toLowerCase();
    const existing = this.getUserAddresses(normalized);
    const updated = existing.filter((a) => a.id !== addressId);

    // If deleted address was default and other addresses remain, make the first one default
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }

    localStorage.setItem(`ecocycle_addresses_${normalized}`, JSON.stringify(updated));
    dispatchStorageEvent();
    return updated;
  },

  setDefaultAddress(userEmail, addressId) {
    if (!userEmail || !addressId) return;
    const normalized = userEmail.trim().toLowerCase();
    const existing = this.getUserAddresses(normalized);
    const updated = existing.map((a) => ({
      ...a,
      isDefault: a.id === addressId,
    }));
    localStorage.setItem(`ecocycle_addresses_${normalized}`, JSON.stringify(updated));
    dispatchStorageEvent();
    return updated;
  },

  /**
   * Edit pickup address on an active customer request.
   * Allowed ONLY when request is in Submitted, Accepted, Schedule Proposed, or Scheduled states.
   * Modifying default address never alters existing requests, but this explicitly updates the request.
   */
  updateRequestPickupDetails(requestId, userEmail, { address, notes, pickupNotes, coordinates }) {
    if (!requestId || !userEmail) {
      throw new Error('Request ID and user email are required.');
    }
    const currentList = this.getAllRequests();
    const idx = currentList.findIndex((r) => r.id === requestId);
    if (idx === -1) {
      throw new Error(`Request #${requestId} was not found.`);
    }

    const req = currentList[idx];
    const normalized = userEmail.trim().toLowerCase();
    if ((req.userEmail || '').toLowerCase() !== normalized) {
      throw new Error('Access denied: You can only edit your own collection requests.');
    }

    if (req.method !== 'pickup') {
      throw new Error('Pickup location editing is only applicable for Doorstep Pickup requests.');
    }

    const editableStatuses = ['Submitted', 'Accepted', 'Schedule Proposed', 'Scheduled', 'Confirmed'];
    if (!editableStatuses.includes(req.status)) {
      throw new Error(
        `Pickup address cannot be modified once the collection is ${req.status.toLowerCase()}. Operational status is now locked.`
      );
    }

    if (!address || address.trim().length < 5) {
      throw new Error('Please provide a complete pickup address.');
    }

    const dateFormatted = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeFormatted = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const newAddress = address.trim();
    const newNotes = notes !== undefined ? notes.trim() : (pickupNotes !== undefined ? pickupNotes.trim() : req.notes);

    req.address = newAddress;
    req.notes = newNotes;

    if (coordinates !== undefined) {
      req.coordinates = coordinates;
    }

    if (req.appointment) {
      req.appointment.pickupAddress = newAddress;
      if (coordinates !== undefined) {
        req.appointment.coordinates = coordinates;
      }
    }

    const historyEntry = {
      time: `${dateFormatted}, ${timeFormatted}`,
      event: `Pickup address details updated by customer: "${newAddress}"`,
      actor: 'Customer',
    };

    req.history = [...(req.history || []), historyEntry];
    currentList[idx] = req;
    this.saveMasterRequests(currentList);
    return req;
  },

  // ==========================================
  // NOTIFICATIONS, SECURITY & PREFERENCES
  // ==========================================

  getUserPreferences(userEmail) {
    if (!userEmail) return { appointmentConfirmations: true, statusUpdates: true, cancellationAlerts: true };
    const normalized = userEmail.trim().toLowerCase();
    try {
      const data = localStorage.getItem(`ecocycle_preferences_${normalized}`);
      return data ? JSON.parse(data) : {
        appointmentConfirmations: true,
        statusUpdates: true,
        cancellationAlerts: true,
      };
    } catch {
      return { appointmentConfirmations: true, statusUpdates: true, cancellationAlerts: true };
    }
  },

  saveUserPreferences(userEmail, preferences) {
    if (!userEmail) return;
    const normalized = userEmail.trim().toLowerCase();
    localStorage.setItem(`ecocycle_preferences_${normalized}`, JSON.stringify(preferences));
    dispatchStorageEvent();
    return preferences;
  },

  updateUserPassword(userEmail, currentPassword, newPassword) {
    if (!userEmail || !currentPassword || !newPassword) {
      throw new Error('Please provide current password and new password.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const normalized = userEmail.trim().toLowerCase();
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
    } catch {
      users = [];
    }

    const idx = users.findIndex((u) => u.email.toLowerCase() === normalized);
    if (idx === -1) {
      throw new Error('User account not found.');
    }

    // Verify current password if user has password recorded
    if (users[idx].password && users[idx].password !== currentPassword) {
      throw new Error('Current password does not match.');
    }

    users[idx].password = newPassword;
    users[idx].passwordUpdatedAt = new Date().toISOString();
    localStorage.setItem('ecocycle_users', JSON.stringify(users));
    return true;
  },

  updateCentrePassword(centreId, currentPassword, newPassword) {
    if (!centreId || !currentPassword || !newPassword) {
      throw new Error('Please provide both current and new password.');
    }
    if (newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    const centre = this.getCentreById(centreId);
    if (!centre) throw new Error('Recycling facility not found.');

    if (centre.password && centre.password !== currentPassword) {
      throw new Error('Current facility password is incorrect.');
    }

    return this.updateCentre(centreId, {
      password: newPassword,
      passwordUpdatedAt: new Date().toISOString(),
    });
  },

  clearNonEssentialUserCache(userEmail) {
    if (!userEmail) return;
    const normalized = userEmail.trim().toLowerCase();
    // Clears search cache, form draft and view state without touching master requests or audit logs
    localStorage.removeItem(`ecocycle_recent_searches_${normalized}`);
    localStorage.removeItem(`ecocycle_form_draft_${normalized}`);
    localStorage.removeItem(`ecocycle_view_cache_${normalized}`);
    dispatchStorageEvent();
    return true;
  },

  clearNonEssentialCentreCache(centreId) {
    if (!centreId) return;
    localStorage.removeItem(`ecocycle_centre_searches_${centreId}`);
    localStorage.removeItem(`ecocycle_centre_view_cache_${centreId}`);
    dispatchStorageEvent();
    return true;
  },

  // ==========================================
  // PERMANENT ACCOUNT DELETION & PENDING SERVICE PROTECTION
  // ==========================================

  /**
   * Evaluates whether a customer account is eligible for permanent deletion.
   * Deletion is strictly blocked if any active, pending, or unresolved collection
   * requests or appointments exist.
   *
   * @param {string} userEmail
   * @returns {{ canDelete: boolean, reason: string|null, unresolvedRequests: Array }}
   */
  checkCustomerDeletionEligibility(userEmail) {
    if (!userEmail) {
      return { canDelete: false, reason: 'Customer email is required.', unresolvedRequests: [] };
    }
    const normalized = userEmail.trim().toLowerCase();
    const all = this.getAllRequests();
    const customerRequests = all.filter((r) => (r.userEmail || '').trim().toLowerCase() === normalized);
    const unresolved = customerRequests.filter((r) => isRequestUnresolved(r.status));

    if (unresolved.length > 0) {
      return {
        canDelete: false,
        reason: `Cannot delete account. You have ${unresolved.length} active or unresolved service request${
          unresolved.length > 1 ? 's' : ''
        } awaiting physical collection or drop-off completion.`,
        unresolvedRequests: unresolved.map((r) => ({
          id: r.id,
          status: r.status,
          category: r.category || 'computing',
          brand: r.brand || '',
          model: r.model || '',
          center: r.center || '',
          method: r.method || 'dropoff',
          date: r.appointment?.date || r.createdAt || '',
        })),
      };
    }

    return {
      canDelete: true,
      reason: null,
      unresolvedRequests: [],
    };
  },

  /**
   * Permanently deletes a customer account and all associated customer data.
   * Strictly enforces pending-service check against authoritative records.
   *
   * @param {string} userEmail
   * @returns {{ success: boolean, email: string, recordsRemoved: number, userRemoved: boolean }}
   */
  deleteCustomerAccount(userEmail) {
    if (!userEmail) {
      throw new Error('Customer email is required.');
    }
    const normalized = userEmail.trim().toLowerCase();

    // 1. Authoritative pending-service protection
    const eligibility = this.checkCustomerDeletionEligibility(normalized);
    if (!eligibility.canDelete) {
      const err = new Error(eligibility.reason || 'Account cannot be deleted because unresolved service requests exist.');
      err.unresolvedRequests = eligibility.unresolvedRequests;
      throw err;
    }

    // 2. Remove user from authoritative ecocycle_users
    let users = [];
    try {
      users = JSON.parse(localStorage.getItem('ecocycle_users') || '[]');
    } catch {
      users = [];
    }

    const userExists = users.some((u) => (u.email || '').trim().toLowerCase() === normalized);
    if (!userExists) {
      throw new Error(`Customer account "${userEmail}" was not found or has already been deleted.`);
    }

    const filteredUsers = users.filter((u) => (u.email || '').trim().toLowerCase() !== normalized);
    localStorage.setItem('ecocycle_users', JSON.stringify(filteredUsers));

    // 3. Clear current customer session if active
    try {
      const savedCurrent = localStorage.getItem('ecocycle_current_user');
      if (savedCurrent) {
        const parsed = JSON.parse(savedCurrent);
        if ((parsed.email || '').trim().toLowerCase() === normalized) {
          localStorage.removeItem('ecocycle_current_user');
        }
      }
    } catch {
      // ignore
    }

    // 4. Clean up user-specific preferences, addresses, hidden requests, drafts, caches
    localStorage.removeItem(`ecocycle_addresses_${normalized}`);
    localStorage.removeItem(`ecocycle_preferences_${normalized}`);
    localStorage.removeItem(`ecocycle_hidden_requests_${normalized}`);
    localStorage.removeItem(`ecocycle_requests_${normalized}`);
    localStorage.removeItem(`ecocycle_recent_searches_${normalized}`);
    localStorage.removeItem(`ecocycle_form_draft_${normalized}`);
    localStorage.removeItem(`ecocycle_view_cache_${normalized}`);

    if (typeof localStorage !== 'undefined' && localStorage.length) {
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.toLowerCase().startsWith('ecocycle_') && k.toLowerCase().includes(normalized)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }

    // 5. Remove customer's resolved/terminal requests from master requests
    const allRequests = this.getAllRequests();
    const remainingRequests = allRequests.filter(
      (r) => (r.userEmail || '').trim().toLowerCase() !== normalized
    );
    this.saveMasterRequests(remainingRequests);

    // 6. Broadcast event
    dispatchStorageEvent();

    return {
      success: true,
      email: normalized,
      recordsRemoved: allRequests.length - remainingRequests.length,
      userRemoved: true,
    };
  },

  /**
   * Evaluates whether a recycling centre account is eligible for permanent deletion.
   * Deletion is strictly blocked if any assigned declarations, collections, or drop-off
   * appointments remain unresolved.
   *
   * @param {string} centreId
   * @returns {{ canDelete: boolean, reason: string|null, unresolvedRequests: Array }}
   */
  checkCentreDeletionEligibility(centreId) {
    if (!centreId) {
      return { canDelete: false, reason: 'Facility ID is required.', unresolvedRequests: [] };
    }
    const centre = this.getCentreById(centreId);
    if (!centre) {
      return { canDelete: false, reason: 'Recycling facility not found.', unresolvedRequests: [] };
    }

    const all = this.getAllRequests();
    const centreName = (centre.name || '').trim().toLowerCase();
    const assignedRequests = all.filter((r) => {
      if (r.centreId && r.centreId === centreId) return true;
      return centreName && (r.center || '').trim().toLowerCase() === centreName;
    });

    const unresolved = assignedRequests.filter((r) => isRequestUnresolved(r.status));

    if (unresolved.length > 0) {
      return {
        canDelete: false,
        reason: `Cannot decommission facility. You have ${unresolved.length} active or unresolved service request${
          unresolved.length > 1 ? 's' : ''
        } awaiting physical collection, drop-off intake, or cancellation.`,
        unresolvedRequests: unresolved.map((r) => ({
          id: r.id,
          status: r.status,
          category: r.category || 'computing',
          brand: r.brand || '',
          model: r.model || '',
          customerEmail: r.userEmail || '',
          customerName: r.customerName || '',
          method: r.method || 'dropoff',
          date: r.appointment?.date || r.createdAt || '',
        })),
      };
    }

    return {
      canDelete: true,
      reason: null,
      unresolvedRequests: [],
    };
  },

  /**
   * Permanently deletes a recycling centre account and its associated operational data.
   * Strictly enforces pending-service check against authoritative records.
   *
   * @param {string} centreId
   * @returns {{ success: boolean, centreId: string, centreName: string, remainingCentres: number }}
   */
  deleteCentreAccount(centreId) {
    if (!centreId) {
      throw new Error('Facility ID is required.');
    }
    const centre = this.getCentreById(centreId);
    if (!centre) {
      throw new Error(`Recycling facility #${centreId} was not found or has already been deleted.`);
    }

    // 1. Authoritative pending-service protection
    const eligibility = this.checkCentreDeletionEligibility(centreId);
    if (!eligibility.canDelete) {
      const err = new Error(eligibility.reason || 'Centre cannot be deleted because unresolved service requests exist.');
      err.unresolvedRequests = eligibility.unresolvedRequests;
      throw err;
    }

    const centreName = (centre.name || '').trim().toLowerCase();

    // 2. Remove centre from authoritative CENTRES_DATA_KEY
    const existing = this.getCentres();
    const updatedCentres = existing.filter((c) => c.id !== centreId);
    localStorage.setItem(CENTRES_DATA_KEY, JSON.stringify(updatedCentres));

    // Also sanitize legacy 'ecocycle_centres' if present
    try {
      const legacyRaw = localStorage.getItem('ecocycle_centres');
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          const legacyCleaned = legacyParsed.filter((c) => c.id !== centreId);
          localStorage.setItem('ecocycle_centres', JSON.stringify(legacyCleaned));
        }
      }
    } catch {
      // ignore
    }

    // 3. Clear centre session if currently authenticated
    try {
      const savedSession = localStorage.getItem('ecocycle_centre_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.centreId === centreId) {
          localStorage.removeItem('ecocycle_centre_session');
        }
      }
    } catch {
      // ignore
    }

    // 4. Clean up centre-specific data
    localStorage.removeItem(`ecocycle_hidden_centre_requests_${centreId}`);
    localStorage.removeItem(`ecocycle_centre_searches_${centreId}`);
    localStorage.removeItem(`ecocycle_centre_view_cache_${centreId}`);

    // 5. Update or clean requests referencing this facility
    const allRequests = this.getAllRequests();
    const updatedRequests = [];

    for (const req of allRequests) {
      const isAssignedToThisCentre =
        (req.centreId && req.centreId === centreId) ||
        (centreName && (req.center || '').trim().toLowerCase() === centreName);

      if (isAssignedToThisCentre) {
        // If request belongs to a customer, keep customer history intact but dissociate centre reference
        if (req.userEmail) {
          const closedLabel = `${centre.name} (Closed / Deregistered)`;
          const updatedReq = {
            ...req,
            centreId: null,
            center: closedLabel,
          };
          if (updatedReq.appointment) {
            updatedReq.appointment = {
              ...updatedReq.appointment,
              centreId: null,
              centreName: closedLabel,
            };
          }
          updatedRequests.push(updatedReq);
        }
        // If no userEmail (internal orphan), drop it
      } else {
        updatedRequests.push(req);
      }
    }

    this.saveMasterRequests(updatedRequests);

    // 6. Broadcast event
    dispatchStorageEvent();

    return {
      success: true,
      centreId,
      centreName: centre.name,
      remainingCentres: updatedCentres.length,
    };
  },

  // ==========================================
  // REAL ENVIRONMENTAL IMPACT CALCULATION
  // ==========================================

  getEnvironmentalImpactStats() {
    const allRequests = this.getAllRequests();
    const centres = this.getCentres();

    // Data integrity rules:
    // Only count physically received requests as received e-waste (Received, Drop-off Completed, Processing, Completed, Recycled)
    // Never count Cancelled or Rejected requests
    const receivedStatuses = ['Received', 'Drop-off Completed', 'Processing', 'Completed', 'Recycled'];
    const receivedRequests = allRequests.filter((r) => receivedStatuses.includes(r.status));

    const totalReceivedKg = receivedRequests.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
    const totalReceivedItems = receivedRequests.reduce((sum, r) => sum + (Number(r.quantity) || 1), 0);
    const totalReceivedRequests = receivedRequests.length;

    // Active collection pipeline (Submitted, Scheduled, In Transit)
    const activePipelineCount = allRequests.filter((r) =>
      ['Submitted', 'Accepted', 'Schedule Proposed', 'Scheduled', 'Confirmed', 'In Transit'].includes(r.status)
    ).length;

    // Normalized category mapping
    const CATEGORY_NAMES = {
      computing: 'Computers & Laptops',
      mobile: 'Smartphones & Tablets',
      battery: 'Batteries & Power Units',
      peripherals: 'Displays & Monitors',
      appliances: 'Home & Office Appliances',
      other: 'Other Electronics',
    };

    // Category distribution strictly for physically received items
    const categoryTotals = {};
    const categoryBreakdown = {};

    receivedRequests.forEach((r) => {
      let rawCat = (r.category || 'other').toLowerCase();
      let normKey = 'other';
      if (rawCat.includes('comput') || rawCat.includes('laptop') || rawCat.includes('server')) {
        normKey = 'computing';
      } else if (rawCat.includes('phone') || rawCat.includes('tablet') || rawCat.includes('mobile')) {
        normKey = 'mobile';
      } else if (rawCat.includes('batter') || rawCat.includes('power')) {
        normKey = 'battery';
      } else if (rawCat.includes('display') || rawCat.includes('monitor') || rawCat.includes('peripheral')) {
        normKey = 'peripherals';
      } else if (rawCat.includes('appliance') || rawCat.includes('telecom')) {
        normKey = 'appliances';
      } else if (CATEGORY_NAMES[rawCat]) {
        normKey = rawCat;
      }

      const weight = Number(r.weight) || 0;
      const quantity = Number(r.quantity) || 1;

      if (!categoryTotals[normKey]) {
        categoryTotals[normKey] = {
          key: normKey,
          label: CATEGORY_NAMES[normKey] || 'Other Electronics',
          weightKg: 0,
          itemCount: 0,
          requestCount: 0,
        };
      }
      categoryTotals[normKey].weightKg += weight;
      categoryTotals[normKey].itemCount += quantity;
      categoryTotals[normKey].requestCount += 1;

      // Legacy key map for backwards compatibility
      categoryBreakdown[rawCat] = (categoryBreakdown[rawCat] || 0) + weight;
    });

    const categoryDistribution = Object.values(categoryTotals).map((cat) => ({
      ...cat,
      weightKg: Number(cat.weightKg.toFixed(2)),
      percentageByWeight: totalReceivedKg > 0 ? Math.round((cat.weightKg / totalReceivedKg) * 100) : 0,
      percentageByUnits: totalReceivedItems > 0 ? Math.round((cat.itemCount / totalReceivedItems) * 100) : 0,
    })).sort((a, b) => b.weightKg - a.weightKg);

    // Intake method breakdown (Doorstep Pickup vs Depot Drop-off)
    let pickupKg = 0;
    let pickupItems = 0;
    let pickupCount = 0;
    let dropoffKg = 0;
    let dropoffItems = 0;
    let dropoffCount = 0;

    receivedRequests.forEach((r) => {
      const isPickup = r.method === 'pickup';
      const weight = Number(r.weight) || 0;
      const quantity = Number(r.quantity) || 1;

      if (isPickup) {
        pickupKg += weight;
        pickupItems += quantity;
        pickupCount += 1;
      } else {
        dropoffKg += weight;
        dropoffItems += quantity;
        dropoffCount += 1;
      }
    });

    const methodDistribution = [
      {
        key: 'pickup',
        label: 'Doorstep Courier Pickup',
        weightKg: Number(pickupKg.toFixed(2)),
        itemCount: pickupItems,
        requestCount: pickupCount,
        percentageByWeight: totalReceivedKg > 0 ? Math.round((pickupKg / totalReceivedKg) * 100) : 0,
        percentageByUnits: totalReceivedItems > 0 ? Math.round((pickupItems / totalReceivedItems) * 100) : 0,
        color: '#F45D16',
        darkColor: '#FF7028',
      },
      {
        key: 'dropoff',
        label: 'Depot Drop-off',
        weightKg: Number(dropoffKg.toFixed(2)),
        itemCount: dropoffItems,
        requestCount: dropoffCount,
        percentageByWeight: totalReceivedKg > 0 ? Math.round((dropoffKg / totalReceivedKg) * 100) : 0,
        percentageByUnits: totalReceivedItems > 0 ? Math.round((dropoffItems / totalReceivedItems) * 100) : 0,
        color: '#4B5563',
        darkColor: '#6B7280',
      },
    ].filter((m) => m.requestCount > 0);

    const hasReceivedData = receivedRequests.length > 0;

    return {
      totalReceivedKg: Number(totalReceivedKg.toFixed(2)),
      totalReceivedItems,
      totalReceivedRequests,
      totalParticipatingCentres: centres.length,
      activePipelineCount,
      categoryBreakdown,
      categoryDistribution,
      methodDistribution,
      hasReceivedData,
    };
  },

  /**
   * Generates a privacy-compliant CSV dataset for R statistical analytics.
   *
   * ANONYMIZATION & ETHICS:
   * - Strictly omits all Personally Identifiable Information (PII): customer names, emails,
   *   phone numbers, and specific apartment/door street numbers.
   * - Retains operational, category, physical weight discrepancy, and regional geographic metadata.
   * - Separates active, completed, cancelled, and rejected declarations.
   *
   * @param {Object} [options]
   * @param {string|null} [options.centreId] - Optional facility filter
   * @returns {string} RFC 4180 compliant CSV string
   */
  exportRequestsForAnalytics({ centreId = null } = {}) {
    let list = this.getAllRequests();
    if (centreId) {
      list = list.filter((r) => r.centreId === centreId);
    }

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'request_id',
      'status',
      'status_group',
      'category',
      'brand',
      'condition',
      'quantity',
      'declared_weight_kg',
      'received_weight_kg',
      'weight_discrepancy_kg',
      'method',
      'centre_id',
      'centre_name',
      'city',
      'has_coordinates',
      'latitude',
      'longitude',
      'created_date',
      'scheduled_date',
    ];

    const rows = list.map((r) => {
      let statusGroup = 'active';
      if (['Received', 'Drop-off Completed', 'Processing', 'Completed', 'Recycled'].includes(r.status)) {
        statusGroup = 'completed';
      } else if (r.status === 'Cancelled') {
        statusGroup = 'cancelled';
      } else if (r.status === 'Rejected') {
        statusGroup = 'rejected';
      }

      const declaredWt = Number(r.weight) || 0;
      let receivedWt = null;
      if (r.receivedWeight !== undefined && r.receivedWeight !== null && r.receivedWeight !== '') {
        const num = Number(r.receivedWeight);
        if (!isNaN(num)) receivedWt = Number(num.toFixed(2));
      } else if (statusGroup === 'completed' && declaredWt > 0) {
        // Fallback for intake records where physical intake matched declaration exactly
        receivedWt = declaredWt;
      }

      const discrepancy = receivedWt !== null ? Number((receivedWt - declaredWt).toFixed(2)) : null;

      const hasCoords = Boolean(
        r.coordinates &&
        typeof r.coordinates.latitude === 'number' &&
        typeof r.coordinates.longitude === 'number' &&
        !isNaN(r.coordinates.latitude) &&
        !isNaN(r.coordinates.longitude)
      );

      const city = r.dropoffFacilityCity || (r.center ? this.getCentreById(r.centreId)?.city : '') || '';

      return [
        escapeCsv(r.id),
        escapeCsv(r.status || 'Submitted'),
        escapeCsv(statusGroup),
        escapeCsv(r.category || 'computing'),
        escapeCsv(r.brand || ''),
        escapeCsv(r.condition || 'working'),
        escapeCsv(r.quantity || 1),
        escapeCsv(declaredWt.toFixed(2)),
        escapeCsv(receivedWt !== null ? receivedWt.toFixed(2) : ''),
        escapeCsv(discrepancy !== null ? discrepancy.toFixed(2) : ''),
        escapeCsv(r.method || 'dropoff'),
        escapeCsv(r.centreId || ''),
        escapeCsv(r.center || ''),
        escapeCsv(city),
        escapeCsv(hasCoords ? 'TRUE' : 'FALSE'),
        escapeCsv(hasCoords ? r.coordinates.latitude : ''),
        escapeCsv(hasCoords ? r.coordinates.longitude : ''),
        escapeCsv(r.createdAt || r.date || ''),
        escapeCsv(r.appointment?.date || ''),
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  },

  /**
   * Triggers a browser download of the analytics CSV dataset.
   *
   * @param {string} [filename='ecocycle_analytics_data.csv']
   * @param {Object} [options]
   * @param {string|null} [options.centreId]
   * @returns {string} The CSV content string
   */
  downloadAnalyticsCsv(filename = 'ecocycle_analytics_data.csv', { centreId = null } = {}) {
    const csvContent = this.exportRequestsForAnalytics({ centreId });
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    return csvContent;
  },
};

