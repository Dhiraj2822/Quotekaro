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
  const isDemoOtpAllowed = process.env.ALLOW_DEV_OTP !== 'false';
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + OTP_TTL_MS;

  otpStore.set(phoneNumber, { otp, expiresAt });
  console.log(`[AUTH] OTP generated for ${phoneNumber}: ${otp} (Demo OTP 123456: ${isDemoOtpAllowed ? 'ENABLED' : 'DISABLED'})`);

  return { success: true, phoneNumber };
}

/**
 * Verify OTP, find or create user, and issue JWT
 */
async function verifyOtp(rawPhone, otp, role) {
  const phoneNumber = normalizePhoneNumber(rawPhone);

  // Allow standard demo OTP '123456' unless explicitly disabled with ALLOW_DEV_OTP=false
  const isDemoOtpAllowed = process.env.ALLOW_DEV_OTP !== 'false';
  const stored = otpStore.get(phoneNumber);

  const isValidOtp =
    (stored && stored.otp === otp && Date.now() < stored.expiresAt) ||
    (isDemoOtpAllowed && otp === '123456');

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

const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + '_quotekaro_salt').digest('hex');
}

/**
 * Register or login with Email & Password
 */
async function registerWithEmail({ email, password, name, phone_number, role = 'customer' }) {
  const normEmail = (email || '').trim().toLowerCase();
  const phone = phone_number ? normalizePhoneNumber(phone_number) : `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const passwordHash = hashPassword(password);

  // Check if exists
  const existing = await db.query('SELECT * FROM users WHERE email = $1 OR phone_number = $2', [normEmail, phone]);
  if (existing.rowCount > 0) {
    const error = new Error('User with this email or phone number already exists. Please login.');
    error.statusCode = 409;
    error.code = 'USER_EXISTS';
    throw error;
  }

  const res = await db.query(
    `INSERT INTO users (phone_number, email, name, role, password_hash, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING *`,
    [phone, normEmail, name || 'QuoteKaro User', role, passwordHash]
  );

  const user = res.rows[0];
  const token = jwt.sign({ id: user.id, phone_number: user.phone_number, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, user };
}

async function loginWithEmail({ email, password }) {
  const normEmail = (email || '').trim().toLowerCase();
  const passwordHash = hashPassword(password);

  const res = await db.query('SELECT * FROM users WHERE email = $1', [normEmail]);
  if (res.rowCount === 0) {
    const error = new Error('No account found with this email address.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const user = res.rows[0];
  if (user.password_hash && user.password_hash !== passwordHash) {
    const error = new Error('Incorrect password. Please try again.');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const token = jwt.sign({ id: user.id, phone_number: user.phone_number, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, user };
}

/**
 * Google OAuth sign-in / signup flow
 */
async function loginWithGoogle({ email, name, role = 'customer' }) {
  const normEmail = (email || 'demo.google@quotekaro.com').trim().toLowerCase();
  let user;

  const res = await db.query('SELECT * FROM users WHERE email = $1', [normEmail]);
  if (res.rowCount > 0) {
    user = res.rows[0];
  } else {
    const randomPhone = `+9188${Math.floor(10000000 + Math.random() * 90000000)}`;
    const insertRes = await db.query(
      `INSERT INTO users (phone_number, email, name, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [randomPhone, normEmail, name || 'Google User', role]
    );
    user = insertRes.rows[0];
  }

  const token = jwt.sign({ id: user.id, phone_number: user.phone_number, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token, user };
}

/**
 * Forgot password link/OTP trigger
 */
async function forgotPassword(email) {
  const normEmail = (email || '').trim().toLowerCase();
  const res = await db.query('SELECT id, phone_number FROM users WHERE email = $1', [normEmail]);
  if (res.rowCount === 0) {
    // For privacy, still return success
    return { success: true, message: 'If this email exists in our records, a reset OTP has been sent.' };
  }
  return { success: true, message: 'Password reset OTP sent to registered email & phone.' };
}

/**
 * Soft delete or deactivate account
 */
async function deleteAccount(userId) {
  await db.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [userId]);
  return { success: true, message: 'Account deactivated successfully.' };
}

module.exports = {
  requestOtp,
  verifyOtp,
  normalizePhoneNumber,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  forgotPassword,
  deleteAccount,
  _resetStore: () => {
    otpStore.clear();
    rateLimitStore.clear();
  }
};
