const db = require('../config/db');
const { notificationsService } = require('../notifications');

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
  if (kyc_status === 'rejected' && (!rejection_reason || !rejection_reason.trim())) {
    const error = new Error('Rejection reason is mandatory when rejecting KYC');
    error.statusCode = 400;
    error.code = 'REJECTION_REASON_REQUIRED';
    throw error;
  }

  // Check if profile exists (accepts profile ID or user ID)
  const existingRes = await db.query(
    `SELECT * FROM provider_profiles WHERE id = $1 OR user_id = $1`,
    [profileId]
  );

  if (!existingRes.rows || existingRes.rows.length === 0) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const existingProfile = existingRes.rows[0];
  const isRejected = kyc_status === 'rejected';
  const cleanReason = isRejected ? rejection_reason.trim() : null;

  // If rejected, provider cannot remain available; persist rejection_reason
  const updateRes = await db.query(
    `UPDATE provider_profiles
     SET kyc_status = $1,
         is_available = CASE WHEN $2 = true THEN false ELSE is_available END,
         rejection_reason = CASE WHEN $2 = true THEN $3 ELSE NULL END,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [kyc_status, isRejected, cleanReason, existingProfile.id]
  );

  const updated = updateRes.rows[0];

  // Dispatch notification to provider
  try {
    if (kyc_status === 'approved') {
      await notificationsService.createNotification(updated.user_id, {
        title: 'KYC Verification Approved! 🎉',
        body: 'Your identity proof and profile have been verified. You can now toggle your availability online and receive customer booking requests.',
        type: 'system',
        metadata: { kyc_status: 'approved' }
      });
    } else if (isRejected) {
      await notificationsService.createNotification(updated.user_id, {
        title: 'KYC Verification Rejected ⚠️',
        body: `Your KYC submission was rejected: "${cleanReason}". Please review the feedback and submit a new document in the app.`,
        type: 'system',
        metadata: { kyc_status: 'rejected', rejection_reason: cleanReason }
      });
    }
  } catch (notifErr) {
    // Non-blocking notification dispatch
  }

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
    rejection_reason: cleanReason
  };
}

module.exports = {
  getProviders,
  updateProviderKyc
};
