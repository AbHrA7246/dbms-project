import { Router } from 'express';
import centreRepository from '../repositories/centreRepository.js';

const router = Router();

/**
 * GET /api/centres
 * Public directory listing of registered recycling centres with pagination and filters.
 * No authentication required.
 */
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      q,
      category,
      city,
      method,
      pickupAvailable,
      dropoffAvailable,
      page,
      limit,
    } = req.query;

    const searchTerm = search || q || '';

    // Parse boolean filters if present
    let parsedPickup;
    if (pickupAvailable !== undefined) {
      parsedPickup = pickupAvailable === 'true' || pickupAvailable === '1';
    }

    let parsedDropoff;
    if (dropoffAvailable !== undefined) {
      parsedDropoff = dropoffAvailable === 'true' || dropoffAvailable === '1';
    }

    const result = await centreRepository.findPublicAll({
      search: searchTerm,
      category: category || '',
      city: city || '',
      method: method || '',
      pickupAvailable: parsedPickup,
      dropoffAvailable: parsedDropoff,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/centres/:id
 * Retrieves a single registered centre's public profile.
 * No authentication required.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const centre = await centreRepository.findPublicById(id);

    if (!centre) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Recycling facility not found.',
      });
    }

    res.status(200).json({
      centre,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
