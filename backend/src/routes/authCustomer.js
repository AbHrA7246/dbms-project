import { Router } from 'express';
import {
  hashPassword,
  comparePassword,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  CUSTOMER_COOKIE_NAME,
  normalizeEmail,
  isValidEmail,
} from '../utils/security.js';
import userRepository from '../repositories/userRepository.js';
import { authenticateCustomer } from '../middleware/authenticate.js';

const router = Router();

/**
 * POST /api/auth/customer/register
 * Registers a new customer account, sets HTTP-only auth cookie.
 */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone, userType, avatarColor } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name is required and must be at least 2 characters.',
      });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A valid email address is required.',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long.',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if account already exists
    const exists = await userRepository.existsByEmail(normalizedEmail);
    if (exists) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await hashPassword(password);

    try {
      const user = await userRepository.create({
        name,
        email: normalizedEmail,
        passwordHash,
        phone,
        userType,
        avatarColor,
      });

      const token = signToken({ id: user.id, email: user.email }, 'customer');
      setAuthCookie(res, CUSTOMER_COOKIE_NAME, token);

      return res.status(201).json({
        message: 'Account registered successfully.',
        user,
      });
    } catch (dbErr) {
      if (dbErr.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'An account with this email address already exists.',
        });
      }
      throw dbErr;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/customer/login
 * Verifies customer credentials and sets HTTP-only auth cookie.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Both email and password are required.',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const userRecord = await userRepository.findByEmail(normalizedEmail);

    if (!userRecord) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    const passwordMatch = await comparePassword(password, userRecord.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    const safeUser = await userRepository.findById(userRecord.id);
    const token = signToken({ id: safeUser.id, email: safeUser.email }, 'customer');
    setAuthCookie(res, CUSTOMER_COOKIE_NAME, token);

    return res.status(200).json({
      message: 'Signed in successfully.',
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/customer/me
 * Returns current authenticated customer profile and preferences.
 */
router.get('/me', authenticateCustomer, (req, res) => {
  res.status(200).json({
    user: req.user,
  });
});

/**
 * POST /api/auth/customer/logout
 * Clears customer authentication cookie.
 */
router.post('/logout', (_req, res) => {
  clearAuthCookie(res, CUSTOMER_COOKIE_NAME);
  res.status(200).json({
    message: 'Logged out successfully.',
  });
});

export default router;
