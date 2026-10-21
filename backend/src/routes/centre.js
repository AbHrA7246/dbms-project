import { Router } from 'express';
import { authenticateCentre } from '../middleware/authenticate.js';
import centreRepository, {
  VALID_DAYS,
  calculateCapacityLimits,
} from '../repositories/centreRepository.js';

const router = Router();

// All centre management endpoints require verified facility manager authentication
router.use(authenticateCentre);

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

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
 * GET /api/centre/profile
 * Retrieves the authenticated recycling facility profile and calculated capacity metrics.
 */
router.get('/profile', async (req, res, next) => {
  try {
    const centre = await centreRepository.findById(req.centre.id);
    if (!centre) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recycling facility profile not found.',
      });
    }

    const capacity = calculateCapacityLimits(centre);

    res.status(200).json({
      centre,
      capacity,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/centre/profile
 * Updates permitted facility profile fields, schedule, categories, and capacity parameters.
 * Enforces atomic multi-table transaction and schedule validation.
 */
router.put('/profile', async (req, res, next) => {
  try {
    const data = req.body || {};
    const existing = await centreRepository.findById(req.centre.id);

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recycling facility not found.',
      });
    }

    // 1. Text validations
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length < 2 || data.name.trim().length > 255) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Facility name must be between 2 and 255 characters.',
        });
      }
    }

    if (data.phone !== undefined) {
      if (typeof data.phone !== 'string' || data.phone.trim().length < 5 || data.phone.trim().length > 50) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Contact phone must be between 5 and 50 characters.',
        });
      }
    }

    if (data.address !== undefined) {
      if (typeof data.address !== 'string' || data.address.trim().length < 3 || data.address.trim().length > 255) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Street address must be between 3 and 255 characters.',
        });
      }
    }

    if (data.city !== undefined) {
      if (typeof data.city !== 'string' || data.city.trim().length < 2 || data.city.trim().length > 100) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'City must be between 2 and 100 characters.',
        });
      }
    }

    // 2. Schedule & Time validations
    const targetOpen = data.openingTime || data.opening_time || existing.openingTime;
    const targetClose = data.closingTime || data.closing_time || existing.closingTime;

    if (data.openingTime !== undefined || data.opening_time !== undefined) {
      if (!TIME_REGEX.test(targetOpen)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Opening time must be in HH:MM format (00:00 to 23:59).',
        });
      }
    }

    if (data.closingTime !== undefined || data.closing_time !== undefined) {
      if (!TIME_REGEX.test(targetClose)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Closing time must be in HH:MM format (00:00 to 23:59).',
        });
      }
    }

    // Ensure opening precedes closing for same-day schedule
    if (targetOpen >= targetClose) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Opening time must precede closing time.',
      });
    }

    // 3. Operating Days validation
    if (data.operatingDaysList !== undefined) {
      if (!Array.isArray(data.operatingDaysList) || data.operatingDaysList.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'At least one valid operating day (Mon, Tue, Wed, Thu, Fri, Sat, Sun) is required.',
        });
      }

      const invalidDays = data.operatingDaysList.filter((d) => !VALID_DAYS.includes(d));
      if (invalidDays.length > 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid operating day specified: ${invalidDays.join(', ')}. Must be one of: ${VALID_DAYS.join(', ')}.`,
        });
      }
    }

    // 4. Waste Categories validation
    const categoriesInput = data.categories || data.accepted;
    if (categoriesInput !== undefined) {
      if (!Array.isArray(categoriesInput) || categoriesInput.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'At least one accepted waste category stream is required.',
        });
      }

      const validCategories = categoriesInput
        .map((c) => (typeof c === 'string' ? c.trim() : ''))
        .filter(Boolean);

      if (validCategories.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'At least one valid non-empty category name is required.',
        });
      }
    }

    // 5. Capacity numbers validation
    if (data.maxWeeklyCapacityKg !== undefined) {
      const kg = Number(data.maxWeeklyCapacityKg);
      if (!Number.isFinite(kg) || kg <= 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Max weekly capacity must be a positive number of kilograms.',
        });
      }
    }

    if (data.maxWeeklyUnits !== undefined) {
      const units = Number(data.maxWeeklyUnits);
      if (!Number.isInteger(units) || units <= 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Max weekly units must be a positive whole integer.',
        });
      }
    }

    if (data.slotLimitKg !== undefined) {
      const slotKg = Number(data.slotLimitKg);
      if (!Number.isFinite(slotKg) || slotKg <= 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Single slot limit must be a positive number of kilograms.',
        });
      }
    }

    if (data.leadTimeDays !== undefined) {
      const lead = Number(data.leadTimeDays);
      if (!Number.isInteger(lead) || lead < 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Lead time must be a non-negative number of days.',
        });
      }
    }

    // 6. Coordinates validation
    let rawLat = data.latitude !== undefined ? data.latitude : data.coordinates?.lat;
    let rawLng = data.longitude !== undefined ? data.longitude : data.coordinates?.lng;

    const coordCheck = validateCoordinates(rawLat, rawLng);
    if (!coordCheck.isValid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: coordCheck.error,
      });
    }

    // Build sanitised payload allowlist (strictly ignoring id, email, password_hash, created_at)
    const updatePayload = {
      name: data.name,
      phone: data.phone,
      address: data.address,
      city: data.city,
      serviceArea: data.serviceArea || data.service_area,
      capabilities: data.capabilities,
      staffName: data.staffName || data.staff_name,
      staffRole: data.staffRole || data.staff_role,
      pickupAvailable: data.pickupAvailable !== undefined ? data.pickupAvailable : data.pickup_available,
      dropoffAvailable: data.dropoffAvailable !== undefined ? data.dropoffAvailable : data.dropoff_available,
      openingTime: targetOpen,
      closingTime: targetClose,
      operatingDaysSummary: data.operatingDaysSummary || data.operatingDays,
      operatingHoursSummary: data.operatingHoursSummary || data.hours,
      maxWeeklyCapacityKg: data.maxWeeklyCapacityKg,
      maxWeeklyUnits: data.maxWeeklyUnits,
      slotLimitKg: data.slotLimitKg,
      leadTimeDays: data.leadTimeDays,
      latitude: coordCheck.lat,
      longitude: coordCheck.lng,
      operatingDaysList: data.operatingDaysList,
      categories: categoriesInput,
    };

    const updated = await centreRepository.updateProfile(req.centre.id, updatePayload);
    const capacity = calculateCapacityLimits(updated);

    res.status(200).json({
      message: 'Facility profile updated successfully.',
      centre: updated,
      capacity,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
