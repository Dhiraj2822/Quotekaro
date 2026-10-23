const jwt = require('jsonwebtoken');
const db = require('../config/db');

// In-memory rate limiting and OTP storage (Redis-compatible fallback)
const otpStore = new Map(); // phone -> { otp, expiresAt }
const rateLimitStore = new Map(); // phone -> [timestamps]

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 5;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production');
  }
  JWT_SECRET = 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Standardize phone number format
 */
function normalizePhoneNumber(phone) {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
}

/**
 * Check and record rate limit for OTP requests
 */
function checkRateLimit(phoneNumber) {
  const now = Date.now();
  const timestamps = rateLimitStore.get(phoneNumber) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  validTimestamps.push(now);
  rateLimitStore.set(phoneNumber, validTimestamps);
  return true;
}

/**
 * Request OTP
 */
async function requestOtp(rawPhone) {
  const phoneNumber = normalizePhoneNumber(rawPhone);

  if (!checkRateLimit(phoneNumber)) {
    const error = new Error('Too many OTP requests for this phone number. Please wait an hour.');
    error.statusCode = 429;
    error.code = 'RATE_LIMIT_EXCEEDED';
    throw error;
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + OTP_TTL_MS;

  otpStore.set(phoneNumber, { otp, expiresAt });

  return { success: true, phoneNumber };
}

/**
 * Verify OTP, find or create user, and issue JWT
 */
async function verifyOtp(rawPhone, otp, role) {
  const phoneNumber = normalizePhoneNumber(rawPhone);

  // In test/dev environment, allow standard test OTP '123456'
  const isDevOrTest = process.env.NODE_ENV !== 'production';
  const stored = otpStore.get(phoneNumber);

  const isValidOtp =
    (stored && stored.otp === otp && Date.now() < stored.expiresAt) ||
    (isDevOrTest && otp === '123456');

  if (!isValidOtp) {
    const error = new Error('Invalid or expired OTP');
    error.statusCode = 400;
    error.code = 'INVALID_OTP';
    throw error;
  }

  // Clear OTP once verified
  otpStore.delete(phoneNumber);

  // Query database for existing user
  const existingUserRes = await db.query(
    'SELECT * FROM users WHERE phone_number = $1',
    [phoneNumber]
  );

  let user;

  if (existingUserRes.rows && existingUserRes.rows.length > 0) {
    user = existingUserRes.rows[0];

    if (!user.is_active) {
      const error = new Error('User account is deactivated');
      error.statusCode = 403;
      error.code = 'ACCOUNT_DEACTIVATED';
      throw error;
    }
  } else {
    // Create new user with given role
    const insertRes = await db.query(
      `INSERT INTO users (phone_number, role, is_active)
       VALUES ($1, $2, true)
       RETURNING *`,
      [phoneNumber, role]
    );
    user = insertRes.rows[0];
  }

  // Generate JWT token
  const payload = {
    id: user.id,
    phone_number: user.phone_number,
    role: user.role
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user.id,
      phone_number: user.phone_number,
      role: user.role,
      name: user.name || null,
      email: user.email || null,
      city: user.city || null,
      profile_photo_url: user.profile_photo_url || null,
      is_active: user.is_active,
      created_at: user.created_at
    }
  };
}

module.exports = {
  requestOtp,
  verifyOtp,
  normalizePhoneNumber,
  _resetStore: () => {
    otpStore.clear();
    rateLimitStore.clear();
  }
};
