import { Router } from 'express';
import {
  hashPassword,
  comparePassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  CENTRE_COOKIE_NAME,
  normalizeEmail,
  isValidEmail,
} from '../utils/security.js';
import centreRepository, { VALID_DAYS } from '../repositories/centreRepository.js';
import { authenticateCentre } from '../middleware/authenticate.js';

const router = Router();

/**
 * POST /api/auth/centre/register
 * Registers a new recycling facility account and sets HTTP-only auth cookie.
 */
router.post('/register', async (req, res, next) => {
  try {
    const data = req.body || {};

    // 1. Validate required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Facility name is required (minimum 2 characters).',
      });
    }

    if (!data.email || !isValidEmail(data.email)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A valid facility contact email address is required.',
      });
    }

    if (!data.password || typeof data.password !== 'string' || data.password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length < 5) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Contact phone number is required (minimum 5 digits).',
      });
    }

    if (!data.address || typeof data.address !== 'string' || data.address.trim().length < 3) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Facility street address is required.',
      });
    }

    if (!data.city || typeof data.city !== 'string' || data.city.trim().length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'City or municipality is required.',
      });
    }

    // 2. Parse operating days
    let operatingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    if (Array.isArray(data.operatingDaysList) && data.operatingDaysList.length > 0) {
      operatingDays = data.operatingDaysList.filter((d) => VALID_DAYS.includes(d));
      if (operatingDays.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'At least one valid operating day (Mon, Tue, Wed, Thu, Fri, Sat, Sun) is required.',
        });
      }
    }

    // 3. Parse categories
    const categories = Array.isArray(data.categories) ? data.categories : [];

    // 4. Coordinates extraction
    let latitude = data.latitude !== undefined ? data.latitude : data.coordinates?.lat;
    let longitude = data.longitude !== undefined ? data.longitude : data.coordinates?.lng;

    const normalizedEmail = normalizeEmail(data.email);

    // 5. Duplicate check
    const exists = await centreRepository.existsByEmail(normalizedEmail);
    if (exists) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A recycling facility with this contact email already exists.',
      });
    }

    const passwordHash = await hashPassword(data.password);

    try {
      const safeCentre = await centreRepository.create(
        {
          name: data.name,
          email: normalizedEmail,
          passwordHash,
          phone: data.phone,
          address: data.address,
          city: data.city,
          serviceArea: data.serviceArea || data.city,
          capabilities: data.capabilities || '',
          maxWeeklyCapacityKg: data.maxWeeklyCapacityKg,
          maxWeeklyUnits: data.maxWeeklyUnits,
          slotLimitKg: data.slotLimitKg,
          leadTimeDays: data.leadTimeDays,
          pickupAvailable: data.pickupAvailable,
          dropoffAvailable: data.dropoffAvailable,
          openingTime: data.openingTime,
          closingTime: data.closingTime,
          operatingDaysSummary: typeof data.operatingDaysSummary === 'string'
            ? data.operatingDaysSummary
            : (Array.isArray(data.operatingDays) ? data.operatingDays.join(', ') : (data.operatingDays || 'Monday to Friday')),
          operatingHoursSummary: typeof data.operatingHoursSummary === 'string'
            ? data.operatingHoursSummary
            : (data.hours || '09:00 AM – 05:00 PM'),
          latitude,
          longitude,
          staffName: data.staffName,
          staffRole: data.staffRole,
        },
        operatingDays,
        categories
      );

      const token = signToken({ id: safeCentre.id, email: safeCentre.email }, 'centre');
      setAuthCookie(res, CENTRE_COOKIE_NAME, token);

      return res.status(201).json({
        message: 'Recycling facility registered successfully.',
        centre: safeCentre,
      });
    } catch (dbErr) {
      if (dbErr.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'A recycling facility with this contact email already exists.',
        });
      }
      throw dbErr;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/centre/login
 * Verifies recycling facility credentials and sets HTTP-only auth cookie.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, emailOrId, password } = req.body || {};
    const identifier = email || emailOrId;

    if (!identifier || !password || typeof identifier !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Facility identifier (email or ID) and password are required.',
      });
    }

    const centreRecord = await centreRepository.findByEmailOrId(identifier);

    if (!centreRecord) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid facility credentials.',
      });
    }

    const passwordMatch = await comparePassword(password, centreRecord.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid facility credentials.',
      });
    }

    const safeCentre = await centreRepository.findById(centreRecord.id);
    const token = signToken({ id: safeCentre.id, email: safeCentre.email }, 'centre');
    setAuthCookie(res, CENTRE_COOKIE_NAME, token);

    return res.status(200).json({
      message: 'Signed in successfully.',
      centre: safeCentre,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/centre/me
 * Returns current authenticated recycling facility profile and configuration.
 */
router.get('/me', authenticateCentre, (req, res) => {
  res.status(200).json({
    centre: req.centre,
  });
});

/**
 * POST /api/auth/centre/logout
 * Clears recycling facility authentication cookie.
 */
router.post('/logout', (_req, res) => {
  clearAuthCookie(res, CENTRE_COOKIE_NAME);
  res.status(200).json({
    message: 'Logged out successfully.',
  });
});

export default router;
