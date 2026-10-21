import {
  verifyToken,
  CUSTOMER_COOKIE_NAME,
  CENTRE_COOKIE_NAME,
} from '../utils/security.js';
import userRepository from '../repositories/userRepository.js';
import centreRepository from '../repositories/centreRepository.js';

/**
 * Safely extracts a JWT from cookies or Authorization Bearer header.
 * @param {import('express').Request} req
 * @param {string} cookieName
 * @returns {string|null}
 */
export function extractToken(req, cookieName) {
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  return null;
}

/**
 * Authentication middleware for customer accounts.
 * Enforces role === 'customer' and verifies the active database record.
 */
export async function authenticateCustomer(req, res, next) {
  const token = extractToken(req, CUSTOMER_COOKIE_NAME);

  if (!token) {
    // If the caller provided a facility token instead, reject with 403 Forbidden
    if (req.cookies && req.cookies[CENTRE_COOKIE_NAME]) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access restricted: Customer account required.',
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please sign in as a customer.',
    });
  }

  try {
    const decoded = verifyToken(token, 'customer');

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Customer account no longer exists.',
      });
    }

    req.user = user;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Session has expired. Please sign in again.',
      });
    }
    if (error.name === 'ForbiddenError' || error.status === 403) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access restricted: Customer account required.',
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or corrupted authentication token.',
    });
  }
}

/**
 * Authentication middleware for recycling facility accounts.
 * Enforces role === 'centre' and verifies the active database record.
 */
export async function authenticateCentre(req, res, next) {
  const token = extractToken(req, CENTRE_COOKIE_NAME);

  if (!token) {
    // If the caller provided a customer token instead, reject with 403 Forbidden
    if (req.cookies && req.cookies[CUSTOMER_COOKIE_NAME]) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access restricted: Recycling facility account required.',
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please sign in as a recycling facility.',
    });
  }

  try {
    const decoded = verifyToken(token, 'centre');

    const centre = await centreRepository.findById(decoded.id);
    if (!centre) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Facility account no longer exists.',
      });
    }

    req.centre = centre;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Session has expired. Please sign in again.',
      });
    }
    if (error.name === 'ForbiddenError' || error.status === 403) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access restricted: Recycling facility account required.',
      });
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or corrupted authentication token.',
    });
  }
}
