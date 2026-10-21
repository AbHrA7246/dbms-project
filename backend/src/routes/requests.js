import { Router } from 'express';
import { authenticateCustomer } from '../middleware/authenticate.js';
import requestService from '../services/requestService.js';

const router = Router();

// All customer collection request endpoints require verified customer authentication
router.use(authenticateCustomer);

/**
 * POST /api/requests
 * Creates a new collection request for the authenticated customer.
 */
router.post('/', async (req, res, next) => {
  try {
    const newRequest = await requestService.createRequest(req.user, req.body || {});
    res.status(201).json({
      message: 'Collection request created successfully.',
      request: newRequest,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/requests
 * Lists collection requests belonging to the authenticated customer.
 * Supports filters: status, category, method, page, limit.
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, category, method, page, limit } = req.query || {};
    const result = await requestService.getCustomerRequests(req.user, {
      status,
      category,
      method,
      page,
      limit,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/requests/:id
 * Retrieves a single collection request by ID, verifying customer ownership.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const request = await requestService.getCustomerRequestById(req.user, req.params.id);
    res.status(200).json({ request });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/requests/:id/history
 * Retrieves immutable audit history events for a customer's collection request.
 */
router.get('/:id/history', async (req, res, next) => {
  try {
    const history = await requestService.getCustomerRequestHistory(req.user, req.params.id);
    res.status(200).json({ history });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/requests/:id/cancel
 * Allows the customer to cancel an active request before collection/transit begins.
 */
router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const updatedRequest = await requestService.cancelCustomerRequest(
      req.user,
      req.params.id,
      reason
    );

    res.status(200).json({
      message: 'Request cancelled successfully.',
      request: updatedRequest,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
