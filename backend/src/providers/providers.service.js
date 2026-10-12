const db = require('../config/db');

/**
 * Get provider profile by profile UUID
 */
async function getProviderProfileById(profileId) {
  const res = await db.query(
    `SELECT p.*, u.name as user_name, u.phone_number, u.city as user_city, u.profile_photo_url as user_photo
     FROM provider_profiles p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [profileId]
  );

  return res.rows && res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * Get provider profile by user_id
 */
async function getProviderProfileByUserId(userId) {
  const res = await db.query(
    `SELECT p.*, u.name as user_name, u.phone_number
     FROM provider_profiles p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [userId]
  );

  return res.rows && res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * Submit KYC document: sets kyc_status to 'pending'
 */
async function submitKyc(userId, documentUrl) {
  const existing = await getProviderProfileByUserId(userId);

  if (existing) {
    const res = await db.query(
      `UPDATE provider_profiles
       SET kyc_document_url = $1, kyc_status = 'pending', is_available = false, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [documentUrl, userId]
    );
    return res.rows[0];
  } else {
    const res = await db.query(
      `INSERT INTO provider_profiles (user_id, kyc_document_url, kyc_status, is_available)
       VALUES ($1, $2, 'pending', false)
       RETURNING *`,
      [userId, documentUrl]
    );
    return res.rows[0];
  }
}

/**
 * Update availability status with hard KYC check
 */
async function updateAvailability(profileId, isAvailable) {
  const profile = await getProviderProfileById(profileId);

  if (!profile) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Hard gate per 09_MODULE_BUILD_PLAN.md DoD and 08_TESTING_STRATEGY.md Scenario D:
  // Only approved providers can be marked is_available = true
  if (isAvailable && profile.kyc_status !== 'approved') {
    const error = new Error('Provider must be KYC approved before becoming available');
    error.statusCode = 400;
    error.code = 'KYC_NOT_APPROVED';
    throw error;
  }

  // Wallet balance threshold check per 04_DATABASE_SCHEMA.md & 08_TESTING_STRATEGY.md §2.6
  const minThreshold = parseInt(process.env.PROVIDER_MIN_WALLET_BALANCE_PAISE || '10000', 10);
  if (isAvailable && profile.wallet_balance_paise !== undefined && profile.wallet_balance_paise !== null) {
    const currentBalance = parseInt(profile.wallet_balance_paise, 10);
    if (currentBalance < minThreshold) {
      const error = new Error(`Wallet balance (₹${(currentBalance / 100).toFixed(2)}) is below minimum threshold (₹${(minThreshold / 100).toFixed(2)}). Please top up your wallet.`);
      error.statusCode = 400;
      error.code = 'INSUFFICIENT_WALLET_BALANCE';
      throw error;
    }
  }

  const res = await db.query(
    `UPDATE provider_profiles
     SET is_available = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [isAvailable, profileId]
  );

  return res.rows[0];
}

/**
 * Update service area and supported service categories
 */
async function updateServiceArea(profileId, { categories, radius_km, lat, lng }) {
  const profile = await getProviderProfileById(profileId);

  if (!profile) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const res = await db.query(
    `UPDATE provider_profiles
     SET categories = $1, service_area_radius_km = $2, base_location_lat = $3, base_location_lng = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [categories, radius_km, lat, lng, profileId]
  );

  return res.rows[0];
}

module.exports = {
  getProviderProfileById,
  getProviderProfileByUserId,
  submitKyc,
  updateAvailability,
  updateServiceArea
};
