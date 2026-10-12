const db = require('../config/db');

/**
 * List providers with joined user details, optionally filtered by kyc_status
 */
async function getProviders({ kyc_status } = {}) {
  let query = `
    SELECT 
      p.*,
      u.name as user_name,
      u.phone_number,
      u.city as user_city,
      u.email as user_email,
      u.profile_photo_url as user_photo
    FROM provider_profiles p
    JOIN users u ON u.id = p.user_id
  `;
  const params = [];

  if (kyc_status) {
    query += ` WHERE p.kyc_status = $1`;
    params.push(kyc_status);
  }

  query += ` ORDER BY p.created_at ASC`;

  const res = await db.query(query, params);
  return res.rows || [];
}

/**
 * Approve or reject provider KYC
 */
async function updateProviderKyc(profileId, { kyc_status, rejection_reason }) {
  // Check if profile exists
  const existingRes = await db.query(
    `SELECT * FROM provider_profiles WHERE id = $1`,
    [profileId]
  );

  if (!existingRes.rows || existingRes.rows.length === 0) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // If rejected, provider cannot remain available
  const updateRes = await db.query(
    `UPDATE provider_profiles
     SET kyc_status = $1,
         is_available = CASE WHEN $1 = 'rejected' THEN false ELSE is_available END,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [kyc_status, profileId]
  );

  const updated = updateRes.rows[0];

  // Fetch joined user info
  const userRes = await db.query(
    `SELECT name as user_name, phone_number, city as user_city, email as user_email, profile_photo_url as user_photo
     FROM users WHERE id = $1`,
    [updated.user_id]
  );

  const user = userRes.rows[0] || {};
  return {
    ...updated,
    ...user,
    rejection_reason: rejection_reason || null
  };
}

module.exports = {
  getProviders,
  updateProviderKyc
};
