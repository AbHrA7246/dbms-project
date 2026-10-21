/**
 * EcoCycle — Geoapify Geocoding Service
 *
 * Provides resilient, privacy-conscious geographic geocoding for collection pickup addresses
 * and physical recycling facility locations using Geoapify's Geocoding API.
 *
 * FEATURES & CONSTRAINTS:
 * - Reads API key from VITE_GEOAPIFY_API_KEY environment variable.
 * - In-memory query caching to minimize outbound quota usage and latency.
 * - Strict coordinate range validation (-90 <= lat <= 90, -180 <= lon <= 180).
 * - Multi-candidate matching: returns ranked candidates and ambiguity detection.
 * - Haversine straight-line distance calculation (Earth radius R = 6371 km).
 * - Graceful degradation: missing key, rate-limits, or offline states never crash the app.
 * - Non-destructive: User-entered raw addresses are preserved; coordinates are attached as metadata.
 * - ZERO automatic facility assignment: Facility selection remains 100% manual.
 */

let overrideApiKey = null;
const memoryCache = new Map();

/**
 * Validates whether latitude and longitude numbers are finite and within geographic limits.
 *
 * @param {number|string} latitude
 * @param {number|string} longitude
 * @returns {boolean}
 */
export function isValidCoordinate(latitude, longitude) {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }
  const lat = typeof latitude === 'number' ? latitude : Number(latitude);
  const lon = typeof longitude === 'number' ? longitude : Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Returns the currently active Geoapify API key from environment or runtime override.
 *
 * @returns {string}
 */
export function getGeocodingApiKey() {
  if (overrideApiKey !== null) {
    return overrideApiKey;
  }
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEOAPIFY_API_KEY) {
      return import.meta.env.VITE_GEOAPIFY_API_KEY;
    }
  } catch {
    // import.meta not available in standard Node execution
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env.VITE_GEOAPIFY_API_KEY) {
      return process.env.VITE_GEOAPIFY_API_KEY;
    }
  } catch {
    // process not available in strict browser environments
  }
  return '';
}

/**
 * Allows setting a runtime API key (useful for automated testing and mocking).
 *
 * @param {string|null} key
 */
export function setGeocodingApiKey(key) {
  overrideApiKey = key;
}

/**
 * Checks if the geocoding service has an API key configured.
 *
 * @returns {boolean}
 */
export function isGeocodingConfigured() {
  const key = getGeocodingApiKey();
  return typeof key === 'string' && key.trim().length > 0;
}

/**
 * Clears the in-memory geocoding cache.
 */
export function clearGeocodingCache() {
  memoryCache.clear();
}

/**
 * Formats a coordinate object into a human-readable geographic string.
 *
 * @param {{ latitude: number, longitude: number } | { lat: number, lon: number }} coords
 * @returns {string}
 */
export function formatCoordinates(coords) {
  if (!coords) return 'Coordinates unavailable';
  const latVal = coords.latitude !== undefined ? coords.latitude : coords.lat;
  const lonVal = coords.longitude !== undefined ? coords.longitude : coords.lon;
  if (!isValidCoordinate(latVal, lonVal)) {
    return 'Coordinates unavailable';
  }
  const latNum = Number(latVal);
  const lonNum = Number(lonVal);
  const latDir = latNum >= 0 ? 'N' : 'S';
  const lonDir = lonNum >= 0 ? 'E' : 'W';
  return `${Math.abs(latNum).toFixed(4)}° ${latDir}, ${Math.abs(lonNum).toFixed(4)}° ${lonDir}`;
}

/**
 * Calculates straight-line distance in kilometers between two geographic coordinates
 * using the Haversine formula (Earth radius R = 6371 km).
 *
 * @param {{ latitude: number, longitude: number } | { lat: number, lon: number }} coords1
 * @param {{ latitude: number, longitude: number } | { lat: number, lon: number }} coords2
 * @returns {number|null} Distance in kilometers rounded to two decimals, or null if invalid.
 */
export function calculateHaversineDistanceKm(coords1, coords2) {
  if (!coords1 || !coords2) return null;

  const lat1Raw = coords1.latitude !== undefined ? coords1.latitude : coords1.lat;
  const lon1Raw = coords1.longitude !== undefined ? coords1.longitude : coords1.lon;
  const lat2Raw = coords2.latitude !== undefined ? coords2.latitude : coords2.lat;
  const lon2Raw = coords2.longitude !== undefined ? coords2.longitude : coords2.lon;

  if (!isValidCoordinate(lat1Raw, lon1Raw) || !isValidCoordinate(lat2Raw, lon2Raw)) {
    return null;
  }

  const lat1 = Number(lat1Raw);
  const lon1 = Number(lon1Raw);
  const lat2 = Number(lat2Raw);
  const lon2 = Number(lon2Raw);

  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  return Number(distanceKm.toFixed(2));
}

/**
 * Formats a distance in kilometers into a user-friendly string (e.g., '2.4 km away').
 *
 * @param {number|null|undefined} distanceKm
 * @returns {string}
 */
export function formatDistanceKm(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm) || typeof distanceKm !== 'number') {
    return 'Distance unavailable';
  }
  if (distanceKm < 0.1) {
    return '< 0.1 km away';
  }
  if (distanceKm < 1) {
    return `${distanceKm.toFixed(2)} km away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Determines a semantic precision label from Geoapify property metadata.
 *
 * @param {Object} props
 * @returns {'exact' | 'institution' | 'street' | 'locality' | 'city' | 'postal_area' | 'approximate'}
 */
export function determineMatchPrecision(props = {}) {
  const resultType = (props.result_type || '').toLowerCase();
  const category = (props.category || '').toLowerCase();

  if (category.includes('education') || category.includes('university') || category.includes('amenity')) {
    return 'institution';
  }
  if (resultType === 'building' || resultType === 'amenity') {
    return 'exact';
  }
  if (resultType === 'street') {
    return 'street';
  }
  if (resultType === 'locality' || resultType === 'suburb' || resultType === 'neighbourhood' || resultType === 'village') {
    return 'locality';
  }
  if (resultType === 'city' || resultType === 'municipality') {
    return 'city';
  }
  if (resultType === 'postcode') {
    return 'postal_area';
  }
  return 'approximate';
}

/**
 * Normalizes an address segment token by trimming whitespace and boundary punctuation.
 *
 * @param {string} token
 * @returns {string}
 */
export function normalizeAddressToken(token) {
  return token ? token.toLowerCase().trim().replace(/^[,\s.-]+|[,\s.-]+$/g, '') : '';
}

/**
 * Splits an address or location string into clean comma/newline-delimited segments.
 *
 * @param {string} str
 * @returns {string[]}
 */
export function tokenizeAddressSegments(str) {
  if (!str || typeof str !== 'string') return [];
  return str
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Verifies whether an existing address segment already represents a candidate location component
 * (e.g. city, state, postal code, country) without naive substring collisions.
 *
 * @param {string} existingSegment
 * @param {string} candidateComponent
 * @returns {boolean}
 */
export function segmentMatchesLocationComponent(existingSegment, candidateComponent) {
  const normExisting = normalizeAddressToken(existingSegment);
  const normCandidate = normalizeAddressToken(candidateComponent);
  if (!normExisting || !normCandidate) return false;

  // Exact segment match (e.g. "Chennai" === "Chennai")
  if (normExisting === normCandidate) return true;

  // Segment with postal code or dash (e.g. "Chennai - 600032" matches "Chennai")
  const alphaOnlyExisting = normExisting.replace(/[\d\s-]+/g, '');
  const alphaOnlyCandidate = normCandidate.replace(/[\d\s-]+/g, '');
  if (alphaOnlyExisting && alphaOnlyCandidate && alphaOnlyExisting === alphaOnlyCandidate) {
    return true;
  }

  return false;
}

/**
 * Constructs a clean, non-duplicated geocoding address query from address and location components.
 * Prevents duplicating city, state, postal code, or country without removing legitimate place names.
 *
 * Supports:
 * - Two arguments: (addressString, locationStringOrObject)
 * - Single structured object: ({ addressLine, city, state, postalCode, country })
 *
 * @param {string|Object} addressInput
 * @param {string|Object} [locationInput]
 * @returns {string}
 */
export function buildAddressGeocodeQuery(addressInput, locationInput = {}) {
  let street = '';
  let city = '';
  let state = '';
  let postalCode = '';
  let country = '';

  if (typeof addressInput === 'object' && addressInput !== null) {
    street = addressInput.addressLine || addressInput.address || addressInput.street || '';
    city = addressInput.city || '';
    state = addressInput.state || '';
    postalCode = addressInput.postalCode || addressInput.postcode || addressInput.zip || '';
    country = addressInput.country || '';
  } else {
    street = typeof addressInput === 'string' ? addressInput : '';
    if (typeof locationInput === 'object' && locationInput !== null) {
      city = locationInput.city || '';
      state = locationInput.state || '';
      postalCode = locationInput.postalCode || locationInput.postcode || '';
      country = locationInput.country || '';
    } else if (typeof locationInput === 'string') {
      city = locationInput;
    }
  }

  const streetSegments = tokenizeAddressSegments(street);

  const isSegmentAlreadyPresent = (candidateComp) => {
    if (!candidateComp) return true;
    return streetSegments.some((seg) => segmentMatchesLocationComponent(seg, candidateComp));
  };

  const additionalParts = [];

  const addComponentIfMissing = (comp) => {
    if (!comp) return;
    const parts = tokenizeAddressSegments(comp);
    for (const part of parts) {
      if (
        !isSegmentAlreadyPresent(part) &&
        !additionalParts.some((p) => segmentMatchesLocationComponent(p, part))
      ) {
        additionalParts.push(part);
      }
    }
  };

  addComponentIfMissing(city);
  addComponentIfMissing(state);
  addComponentIfMissing(postalCode);
  addComponentIfMissing(country);

  const finalSegments = [...streetSegments, ...additionalParts];
  return finalSegments.join(', ');
}

const INDIAN_STATES = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa',
  'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala',
  'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland',
  'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
  'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'puducherry', 'tn', 'ka', 'mh', 'dl'
]);

const INDIAN_METROS = new Set([
  'chennai', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'new delhi',
  'hyderabad', 'kolkata', 'pune', 'ahmedabad', 'jaipur', 'surat', 'lucknow',
  'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam', 'patna',
  'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'coimbatore', 'madurai'
]);

const US_STATES = new Set([
  'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'ia', 'ks',
  'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj', 'nm', 'ny',
  'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tx', 'ut', 'vt', 'va', 'wa', 'wv',
  'wi', 'wy', 'california', 'new york', 'texas', 'florida', 'washington', 'illinois'
]);

const US_METROS = new Set([
  'san francisco', 'new york', 'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia',
  'san antonio', 'san diego', 'dallas', 'san jose', 'austin', 'seattle', 'denver', 'boston'
]);

const STOP_WORDS = new Set(['in', 'the', 'at', 'on', 'of', 'and', 'for', 'to', 'a', 'an', 'near', 'opp', 'opposite']);
const BROAD_GEO = new Set(['india', 'in', 'usa', 'united states', 'uk', 'great britain', 'gb']);

/**
 * Infers an appropriate ISO-3166-1 alpha-2 country code for Geoapify country filtering.
 * Never hardcodes India for all addresses; detects country based on address components or options.
 *
 * @param {string} query
 * @param {Object} [options]
 * @returns {string|null}
 */
export function inferCountryCode(query, options = {}) {
  if (options.countryCode) {
    return options.countryCode.toLowerCase().trim();
  }
  if (!query || typeof query !== 'string') return null;

  const lower = query.toLowerCase();
  const segments = lower.split(/[,;\n]+/).map((s) => s.trim().replace(/^[.\s-]+|[.\s-]+$/g, ''));

  for (const seg of segments) {
    if (seg === 'india' || seg === 'in') return 'in';
    if (seg === 'united states' || seg === 'usa' || seg === 'us' || seg === 'united states of america') return 'us';
    if (seg === 'united kingdom' || seg === 'uk' || seg === 'great britain' || seg === 'gb') return 'gb';
    if (INDIAN_STATES.has(seg)) return 'in';
    if (INDIAN_METROS.has(seg)) return 'in';
    if (US_STATES.has(seg)) return 'us';
    if (US_METROS.has(seg)) return 'us';
  }

  const words = lower.split(/[\s,.-]+/).filter(Boolean);
  if (words.includes('india')) return 'in';
  for (const w of words) {
    if (INDIAN_METROS.has(w)) return 'in';
  }

  return null;
}

/**
 * Extracts specific premise/street/locality tokens and general geographic tokens from a query.
 *
 * @param {string} query
 * @returns {{ specificTokens: string[], generalTokens: string[], allKeywords: string[] }}
 */
export function extractAddressQueryTokens(query) {
  if (!query || typeof query !== 'string') return { specificTokens: [], generalTokens: [], allKeywords: [] };
  const segments = query.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return { specificTokens: [], generalTokens: [], allKeywords: [] };

  const specificTokens = [];
  const generalTokens = [];

  segments.forEach((seg, idx) => {
    const norm = seg.toLowerCase().trim();
    const isCountry = BROAD_GEO.has(norm);
    const isState = INDIAN_STATES.has(norm);
    const isCity = INDIAN_METROS.has(norm) || US_METROS.has(norm);
    const isPostcode = /^\d{5,6}(-\d{4})?$/.test(norm);
    const isLikelyCity = idx >= Math.max(1, segments.length - 3) && (isCity || idx === segments.length - 2);

    const words = norm
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

    if (isCountry || isState || isCity || isPostcode || isLikelyCity) {
      generalTokens.push(...words);
    } else {
      specificTokens.push(...words);
    }
  });

  if (specificTokens.length === 0) {
    segments.forEach((seg) => {
      const words = seg
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
      specificTokens.push(...words);
    });
  }

  return {
    specificTokens: Array.from(new Set(specificTokens)),
    generalTokens: Array.from(new Set(generalTokens)),
    allKeywords: Array.from(new Set([...specificTokens, ...generalTokens])),
  };
}

/**
 * Transforms a Geoapify GeoJSON feature into a standardized coordinate candidate object,
 * preserving all provider metadata, confidence levels, and location boundaries.
 *
 * @param {Object} feature
 * @param {string} fallbackQuery
 * @returns {Object|null}
 */
export function parseFeatureToCandidate(feature, fallbackQuery) {
  if (!feature) return null;
  const props = feature.properties || {};
  const geom = feature.geometry || {};

  const rawLat = props.lat !== undefined ? props.lat : (Array.isArray(geom.coordinates) ? geom.coordinates[1] : null);
  const rawLon = props.lon !== undefined ? props.lon : (Array.isArray(geom.coordinates) ? geom.coordinates[0] : null);

  const lat = Number(rawLat);
  const lon = Number(rawLon);

  if (!isValidCoordinate(lat, lon)) {
    return null;
  }

  const rankObj = props.rank || {};
  const confidence =
    typeof rankObj.confidence === 'number'
      ? rankObj.confidence
      : typeof props.confidence === 'number'
      ? props.confidence
      : null;

  const precision = determineMatchPrecision(props);
  const matchType = rankObj.match_type || props.match_type || precision;

  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lon.toFixed(6)),
    formattedAddress: props.formatted || fallbackQuery,
    addressLine1: props.address_line1 || '',
    addressLine2: props.address_line2 || '',
    provider: 'geoapify',
    status: 'verified',
    confidence,
    confidenceCityLevel: rankObj.confidence_city_level ?? props.confidence_city_level ?? null,
    confidenceStreetLevel: rankObj.confidence_street_level ?? props.confidence_street_level ?? null,
    confidenceBuildingLevel: rankObj.confidence_building_level ?? props.confidence_building_level ?? null,
    matchType,
    precision,
    resultType: props.result_type || 'address',
    name: props.name || '',
    street: props.street || '',
    housenumber: props.housenumber || '',
    suburb: props.suburb || '',
    district: props.district || '',
    city: props.city || '',
    state: props.state || '',
    postcode: props.postcode || '',
    country: props.country || '',
    category: props.category || '',
    placeId: props.place_id || '',
    datasource: props.datasource || null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Evaluates candidate locations for geographic relevance to the original query,
 * rejects clearly irrelevant results, and ranks remaining candidates by relevance score.
 *
 * Constraints:
 * - Does not automatically reject a legitimate match merely because its administrative zone label differs.
 * - Does not use a confidence threshold alone as a substitute for geographic relevance.
 * - Prefers meaningful street, locality, industrial-estate or institution matches over unrelated businesses.
 *
 * @param {Object[]} candidates
 * @param {string} originalQuery
 * @param {Object} [options]
 * @returns {Object[]}
 */
export function rankAndFilterCandidates(candidates, originalQuery, options = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  if (candidates.length === 1 && (!originalQuery || originalQuery.trim().length === 0)) {
    return candidates;
  }

  const { specificTokens, generalTokens } = extractAddressQueryTokens(originalQuery);

  const scored = candidates.map((c) => {
    const candText = [
      c.formattedAddress || '',
      c.name || '',
      c.street || '',
      c.suburb || '',
      c.district || '',
      c.city || '',
      c.state || '',
      c.postcode || '',
    ]
      .join(' ')
      .toLowerCase();

    const specificMatches = specificTokens.filter((t) => candText.includes(t));
    const generalMatches = generalTokens.filter((t) => candText.includes(t));

    const specificRatio = specificTokens.length > 0 ? specificMatches.length / specificTokens.length : 1;
    const generalRatio = generalTokens.length > 0 ? generalMatches.length / generalTokens.length : 1;
    const confidence = typeof c.confidence === 'number' ? c.confidence : 0.5;

    let typeBonus = 0;
    const resType = (c.resultType || '').toLowerCase();
    const candNameOrAddress = (c.name || c.formattedAddress || '').toLowerCase();

    const queryHasFacilityKeywords = specificTokens.some((t) =>
      ['estate', 'industrial', 'sidco', 'park', 'zone', 'complex', 'campus', 'depot', 'centre', 'center'].includes(t)
    );

    if (queryHasFacilityKeywords) {
      if (
        candNameOrAddress.includes('industrial') ||
        candNameOrAddress.includes('estate') ||
        candNameOrAddress.includes('sidco') ||
        candNameOrAddress.includes('park') ||
        candNameOrAddress.includes('zone')
      ) {
        typeBonus += 2.0;
      }
      if (resType === 'city' || resType === 'state' || resType === 'country') {
        typeBonus -= 3.0;
      }
    }

    if (resType === 'amenity' || resType === 'building' || resType === 'street' || resType === 'locality') {
      typeBonus += 0.5;
    }

    // Check if clearly irrelevant
    let isClearlyIrrelevant = false;

    // 1. If specific premise/facility tokens were present in the query, but candidate matches 0 of them
    if (specificTokens.length > 0 && specificMatches.length === 0) {
      isClearlyIrrelevant = true;
    }

    // 2. Reject broad city/state fallbacks when specific premise tokens were searched and other candidates exist
    if (resType === 'city' && specificTokens.length > 0) {
      isClearlyIrrelevant = true;
    }

    // 3. Reject candidates in completely different cities when city was specified
    const candCity = (c.city || '').toLowerCase();
    const targetCityToken = generalTokens.find((t) => INDIAN_METROS.has(t));
    if (targetCityToken && candCity && candCity !== targetCityToken && !candText.includes(targetCityToken)) {
      isClearlyIrrelevant = true;
    }

    // 4. Reject candidates in completely different states when state was specified
    const candState = (c.state || '').toLowerCase();
    const targetStateToken = generalTokens.find((t) => INDIAN_STATES.has(t));
    if (targetStateToken && candState && candState !== targetStateToken && !candText.includes(targetStateToken)) {
      isClearlyIrrelevant = true;
    }

    const score = specificRatio * 4.0 + generalRatio * 2.0 + confidence * 1.5 + typeBonus;

    return {
      candidate: c,
      score,
      specificMatches,
      generalMatches,
      isClearlyIrrelevant,
    };
  });

  const relevant = scored.filter((s) => !s.isClearlyIrrelevant);
  const pool = relevant.length > 0 ? relevant : [];

  pool.sort((a, b) => b.score - a.score);
  return pool.map((p) => p.candidate);
}

/**
 * Geocodes an address using Geoapify Geocoding API.
 * Supports multi-candidate matching (returns primary `data` plus array of `results`).
 *
 * @param {string|Object} addressInput - Full/partial address string or structured address object
 * @param {Object} [options]
 * @param {number} [options.limit=5] - Maximum number of candidate locations to return
 * @param {boolean} [options.bypassCache=false]
 * @param {string} [options.countryCode] - Optional ISO country code override (e.g. 'in')
 * @param {string} [options.filter] - Optional Geoapify filter parameter
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{
 *   success: boolean,
 *   status: 'verified' | 'unconfigured' | 'invalid_input' | 'not_found' | 'rate_limited' | 'unauthorized' | 'network_error' | 'timeout' | 'api_error' | 'invalid_coordinates',
 *   message?: string,
 *   fromCache?: boolean,
 *   isAmbiguous?: boolean,
 *   data?: Object,
 *   results?: Object[]
 * }>}
 */
export async function geocodeAddress(addressInput, options = {}) {
  // 1. Format and sanitize address query
  const query =
    typeof addressInput === 'object' && addressInput !== null
      ? buildAddressGeocodeQuery(addressInput)
      : typeof addressInput === 'string'
      ? buildAddressGeocodeQuery(addressInput)
      : '';

  if (!query || query.trim().length < 3) {
    return {
      success: false,
      status: 'invalid_input',
      message: 'Please provide a valid street address for coordinate lookup.',
    };
  }

  const normalized = query.trim().toLowerCase();

  // 2. Cache inspection
  if (!options.bypassCache && memoryCache.has(normalized)) {
    const cached = memoryCache.get(normalized);
    const primary = cached.data || cached;
    const results = cached.results || [primary];
    return {
      success: true,
      status: 'verified',
      fromCache: true,
      isAmbiguous: Boolean(cached.isAmbiguous),
      data: { ...primary },
      results: results.map((r) => ({ ...r })),
    };
  }

  // 3. API key validation
  const apiKey = getGeocodingApiKey();
  if (!apiKey || !apiKey.trim()) {
    return {
      success: false,
      status: 'unconfigured',
      message: 'Geoapify API key is not configured. Coordinate lookup is unavailable.',
    };
  }

  // 4. Dispatch request to Geoapify with country filter if appropriate
  const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 5;
  const countryCode = inferCountryCode(query, options);

  let endpoint = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
    query.trim()
  )}&apiKey=${encodeURIComponent(apiKey.trim())}&limit=${limit}`;

  if (countryCode) {
    endpoint += `&filter=countrycode:${encodeURIComponent(countryCode)}`;
  } else if (options.filter) {
    endpoint += `&filter=${encodeURIComponent(options.filter)}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: options.signal || controller.signal,
    });

    clearTimeout(timeoutId);

    // 5. Handle HTTP status codes gracefully
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        status: 'unauthorized',
        message: 'Geoapify API key is invalid or unauthorized.',
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        status: 'rate_limited',
        message: 'Geocoding rate limit reached. Please try again shortly.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        status: 'api_error',
        message: `Geocoding request failed (HTTP ${response.status}).`,
      };
    }

    const payload = await response.json();
    const features = Array.isArray(payload?.features) ? payload.features : [];

    if (features.length === 0) {
      return {
        success: false,
        status: 'not_found',
        message: 'No geographic coordinates found for this address.',
      };
    }

    const parsedCandidates = features
      .map((f) => parseFeatureToCandidate(f, query.trim()))
      .filter(Boolean);

    if (parsedCandidates.length === 0) {
      return {
        success: false,
        status: 'invalid_coordinates',
        message: 'Geocoding provider returned invalid coordinate boundaries.',
      };
    }

    // 6. Rank and filter candidates for geographic relevance
    const candidateResults = rankAndFilterCandidates(parsedCandidates, query, options);

    if (candidateResults.length === 0) {
      return {
        success: false,
        status: 'not_found',
        message: 'No relevant geographic coordinates found for this address.',
      };
    }

    const topFeature = candidateResults[0];
    const isAmbiguous = candidateResults.length > 1;

    const cacheEntry = {
      data: topFeature,
      results: candidateResults,
      isAmbiguous,
    };
    memoryCache.set(normalized, cacheEntry);

    return {
      success: true,
      status: 'verified',
      fromCache: false,
      isAmbiguous,
      data: topFeature,
      results: candidateResults,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return {
        success: false,
        status: 'timeout',
        message: 'Geocoding request timed out after 8 seconds.',
      };
    }
    return {
      success: false,
      status: 'network_error',
      message: 'Network error connecting to Geoapify geocoding service.',
    };
  }
}

