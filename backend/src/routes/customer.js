import { Router } from 'express';
import { authenticateCustomer } from '../middleware/authenticate.js';
import userRepository from '../repositories/userRepository.js';
import addressRepository from '../repositories/addressRepository.js';
import { hashPassword, comparePassword } from '../utils/security.js';

const router = Router();

// All customer endpoints require verified customer authentication
router.use(authenticateCustomer);

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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Customer Profile Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/customer/profile
 * Updates customer's display name, phone, userType, and avatar color.
 */
router.put('/profile', async (req, res, next) => {
  try {
    const { name, phone, avatarColor, userType } = req.body || {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 255) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Name must be between 2 and 255 characters.',
        });
      }
    }

    if (phone !== undefined && phone !== null) {
      if (typeof phone !== 'string' || phone.trim().length > 50) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Phone number cannot exceed 50 characters.',
        });
      }
    }

    if (avatarColor !== undefined && avatarColor !== null) {
      if (typeof avatarColor !== 'string' || avatarColor.trim().length > 50) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Avatar color cannot exceed 50 characters.',
        });
      }
    }

    if (userType !== undefined && userType !== null) {
      if (typeof userType !== 'string' || userType.trim().length > 50) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'User type cannot exceed 50 characters.',
        });
      }
    }

    const updatedUser = await userRepository.updateProfile(req.user.id, {
      name,
      phone,
      avatarColor,
      userType,
    });

    res.status(200).json({
      message: 'Profile updated successfully.',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/customer/password
 * Changes customer's password after verifying current password.
 */
router.put('/password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password is required.',
      });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 8 characters long.',
      });
    }

    const storedHash = await userRepository.getPasswordHash(req.user.id);
    if (!storedHash) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Customer account not found.',
      });
    }

    const matches = await comparePassword(currentPassword, storedHash);
    if (!matches) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password does not match.',
      });
    }

    const newHash = await hashPassword(newPassword);
    await userRepository.updatePassword(req.user.id, newHash);

    res.status(200).json({
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Notification Preferences
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/customer/preferences
 * Returns customer's notification preferences.
 */
router.get('/preferences', async (req, res, next) => {
  try {
    const preferences = await userRepository.getPreferences(req.user.id);
    res.status(200).json({
      preferences: preferences || {
        appointmentConfirmations: true,
        statusUpdates: true,
        cancellationAlerts: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/customer/preferences
 * Updates customer's notification preferences.
 */
router.put('/preferences', async (req, res, next) => {
  try {
    const { appointmentConfirmations, statusUpdates, cancellationAlerts } = req.body || {};

    const updated = await userRepository.updatePreferences(req.user.id, {
      appointmentConfirmations,
      statusUpdates,
      cancellationAlerts,
    });

    res.status(200).json({
      message: 'Notification preferences updated successfully.',
      preferences: updated,
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Saved Address Book
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/customer/addresses
 * Returns list of customer's saved addresses, ordered with default first.
 */
router.get('/addresses', async (req, res, next) => {
  try {
    const addresses = await addressRepository.findByUserId(req.user.id);
    res.status(200).json({
      addresses,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/customer/addresses
 * Creates a new address or updates an existing address owned by the customer.
 */
router.post('/addresses', async (req, res, next) => {
  try {
    const {
      id,
      label,
      addressLine,
      city,
      state,
      postalCode,
      pickupInstructions,
      isDefault,
      latitude,
      longitude,
      coordinates,
    } = req.body || {};

    if (!addressLine || typeof addressLine !== 'string' || addressLine.trim().length < 3) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Address line is required (minimum 3 characters).',
      });
    }

    if (!city || typeof city !== 'string' || city.trim().length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'City is required (minimum 2 characters).',
      });
    }

    // Extract and validate coordinates
    let rawLat = latitude !== undefined ? latitude : coordinates?.lat;
    let rawLng = longitude !== undefined ? longitude : coordinates?.lng;

    const coordCheck = validateCoordinates(rawLat, rawLng);
    if (!coordCheck.isValid) {
      return res.status(400).json({
        error: 'Bad Request',
        message: coordCheck.error,
      });
    }

    const payload = {
      id,
      label,
      addressLine,
      city,
      state,
      postalCode,
      pickupInstructions,
      isDefault,
      latitude: coordCheck.lat,
      longitude: coordCheck.lng,
    };

    // If id is provided and exists for this user, perform update
    if (id) {
      const existing = await addressRepository.findByIdAndUserId(id, req.user.id);
      if (existing) {
        const updated = await addressRepository.update(id, req.user.id, payload);
        return res.status(200).json({
          message: 'Address updated successfully.',
          address: updated,
        });
      }
    }

    // Otherwise create new address
    const created = await addressRepository.create(req.user.id, payload);
    res.status(201).json({
      message: 'Address saved successfully.',
      address: created,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/customer/addresses/:id
 * Deletes a saved address, ensuring customer ownership and active request safety.
 */
router.delete('/addresses/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await addressRepository.findByIdAndUserId(id, req.user.id);
    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Address record not found or does not belong to your account.',
      });
    }

    // Block deletion if address is attached to an active collection request
    const isAttached = await addressRepository.isAddressAttachedToActiveRequest(id, req.user.id);
    if (isAttached) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot delete address: it is currently attached to an active collection request awaiting physical service.',
      });
    }

    await addressRepository.delete(id, req.user.id);

    res.status(200).json({
      message: 'Address deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/customer/addresses/:id/default
 * Designates the specified address as the customer's default address.
 */
router.post('/addresses/:id/default', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await addressRepository.findByIdAndUserId(id, req.user.id);
    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Address record not found or does not belong to your account.',
      });
    }

    const updated = await addressRepository.setDefault(id, req.user.id);

    res.status(200).json({
      message: 'Default address updated successfully.',
      address: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
