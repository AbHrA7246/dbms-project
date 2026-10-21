import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const CUSTOMER_COOKIE_NAME = 'ecocycle_cust_token';
export const CENTRE_COOKIE_NAME = 'ecocycle_fac_token';

const BCRYPT_SALT_ROUNDS = 12;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is strictly required in production.');
  }
  return secret || 'dev_jwt_secret_ecocycle_do_not_use_in_production_128bit_key';
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '7d';
}

/**
 * Safely hashes a plaintext password using bcrypt with 12 salt rounds.
 * @param {string} password Plaintext password
 * @returns {Promise<string>} Bcrypt hash
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compares plaintext password against a bcrypt hash in constant time.
 * @param {string} password Plaintext password
 * @param {string} hash Stored bcrypt hash
 * @returns {Promise<boolean>} True if matched
 */
export async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Signs a JSON Web Token strictly embedding the user role and identifier.
 * @param {object} payload Payload data (id, email, etc.)
 * @param {'customer'|'centre'} role Authenticated account role
 * @param {object} [options] Custom JWT signing options
 * @returns {string} Signed JWT
 */
export function signToken(payload, role, options = {}) {
  if (!role || !['customer', 'centre'].includes(role)) {
    throw new Error(`Invalid token role specified: ${role}`);
  }

  const cleanPayload = {
    id: payload.id,
    email: payload.email,
    role,
  };

  return jwt.sign(cleanPayload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
    ...options,
  });
}

/**
 * Verifies and decodes a JWT, optionally enforcing an expected role.
 * @param {string} token Encoded JWT string
 * @param {'customer'|'centre'} [expectedRole] Expected role to enforce
 * @returns {object} Decoded JWT payload
 */
export function verifyToken(token, expectedRole = null) {
  if (!token) {
    const error = new Error('No authentication token provided.');
    error.name = 'JsonWebTokenError';
    error.status = 401;
    throw error;
  }

  const decoded = jwt.verify(token, getJwtSecret());

  if (expectedRole && decoded.role !== expectedRole) {
    const error = new Error(`Access forbidden: token role (${decoded.role}) does not have required permissions (${expectedRole}).`);
    error.name = 'ForbiddenError';
    error.status = 403;
    throw error;
  }

  return decoded;
}

/**
 * Returns security-hardened cookie configuration options.
 * @param {object} [customOptions] Additional or overridden cookie options
 * @returns {object} Cookie options object
 */
export function getCookieOptions(customOptions = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    ...customOptions,
  };
}

/**
 * Sets an HTTP-only authentication cookie on the HTTP response.
 * @param {import('express').Response} res Express response object
 * @param {string} cookieName Name of cookie
 * @param {string} token Signed JWT token
 * @param {object} [customOptions] Override cookie options
 */
export function setAuthCookie(res, cookieName, token, customOptions = {}) {
  res.cookie(cookieName, token, getCookieOptions(customOptions));
}

/**
 * Safely clears an HTTP-only authentication cookie.
 * @param {import('express').Response} res Express response object
 * @param {string} cookieName Name of cookie
 * @param {object} [customOptions] Override cookie options
 */
export function clearAuthCookie(res, cookieName, customOptions = {}) {
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...customOptions,
  });
}

/**
 * Normalizes an email address to lowercase and trimmed string.
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * Validates whether a string matches a standard email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
