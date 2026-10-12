const db = require('../config/db');
const { sanitizeText } = require('../utils/sanitize');

/**
 * Raise a dispute against a booking.
 * Caller must be either the customer, the assigned provider, or an admin.
 */
async function createDispute({ bookingId, userId, userRole, reason }) {
  // 1. Fetch booking with participant details
  const bookingRes = await db.query(
    `SELECT b.id, b.customer_id, b.provider_id, pp.user_id AS provider_user_id
     FROM bookings b
     JOIN provider_profiles pp ON pp.id = b.provider_id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (!bookingRes.rows || bookingRes.rows.length === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];

  // 2. Check authorization: customer, assigned provider, or admin
  const isCustomer = booking.customer_id === userId;
  const isProvider = booking.provider_user_id === userId;
  const isAdmin = userRole === 'admin';

  if (!isCustomer && !isProvider && !isAdmin) {
    const error = new Error('You are not authorized to raise a dispute for this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // 3. Insert into disputes table (with text sanitization)
  const cleanReason = sanitizeText(reason);
  const insertRes = await db.query(
    `INSERT INTO disputes (booking_id, raised_by, reason, status)
     VALUES ($1, $2, $3, 'open')
     RETURNING *`,
    [bookingId, userId, cleanReason]
  );

  return insertRes.rows[0];
}

/**
 * List all disputes with populated details (Admin only).
 * Supports status filtering and pagination.
 */
async function getDisputes({ status, limit = 50, offset = 0 } = {}) {
  let query = `
    SELECT 
      d.id,
      d.booking_id,
      d.raised_by,
      d.reason,
      d.status,
      d.resolution_notes,
      d.created_at,
      d.updated_at,
      u_raiser.name AS raiser_name,
      u_raiser.phone_number AS raiser_phone,
      u_raiser.role AS raiser_role,
      b.status AS booking_status,
      b.scheduled_at AS booking_scheduled_at,
      b.completed_at AS booking_completed_at,
      b.before_photo_url,
      b.after_photo_url,
      q.price_paise,
      j.id AS job_id,
      j.description AS job_description,
      j.category AS job_category,
      j.area AS job_area,
      j.photo_urls AS job_photo_urls,
      u_cust.id AS customer_id,
      u_cust.name AS customer_name,
      u_cust.phone_number AS customer_phone,
      u_cust.city AS customer_city,
      p.id AS provider_profile_id,
      u_prov.id AS provider_user_id,
      u_prov.name AS provider_name,
      u_prov.phone_number AS provider_phone
    FROM disputes d
    JOIN users u_raiser ON u_raiser.id = d.raised_by
    JOIN bookings b ON b.id = d.booking_id
    JOIN jobs j ON j.id = b.job_id
    LEFT JOIN quotes q ON q.id = b.quote_id
    JOIN provider_profiles p ON p.id = b.provider_id
    JOIN users u_prov ON u_prov.id = p.user_id
    JOIN users u_cust ON u_cust.id = b.customer_id
  `;

  const params = [];
  if (status) {
    params.push(status);
    query += ` WHERE d.status = $${params.length}`;
  }

  query += ` ORDER BY d.created_at DESC`;

  if (limit) {
    params.push(limit);
    query += ` LIMIT $${params.length}`;
  }
  if (offset) {
    params.push(offset);
    query += ` OFFSET $${params.length}`;
  }

  const res = await db.query(query, params);
  return res.rows || [];
}

/**
 * Get dispute by ID with full details (Admin only).
 */
async function getDisputeById(disputeId) {
  const query = `
    SELECT 
      d.id,
      d.booking_id,
      d.raised_by,
      d.reason,
      d.status,
      d.resolution_notes,
      d.created_at,
      d.updated_at,
      u_raiser.name AS raiser_name,
      u_raiser.phone_number AS raiser_phone,
      u_raiser.role AS raiser_role,
      b.status AS booking_status,
      b.scheduled_at AS booking_scheduled_at,
      b.completed_at AS booking_completed_at,
      b.before_photo_url,
      b.after_photo_url,
      q.price_paise,
      j.id AS job_id,
      j.description AS job_description,
      j.category AS job_category,
      j.area AS job_area,
      j.photo_urls AS job_photo_urls,
      u_cust.id AS customer_id,
      u_cust.name AS customer_name,
      u_cust.phone_number AS customer_phone,
      u_cust.city AS customer_city,
      p.id AS provider_profile_id,
      u_prov.id AS provider_user_id,
      u_prov.name AS provider_name,
      u_prov.phone_number AS provider_phone
    FROM disputes d
    JOIN users u_raiser ON u_raiser.id = d.raised_by
    JOIN bookings b ON b.id = d.booking_id
    JOIN jobs j ON j.id = b.job_id
    LEFT JOIN quotes q ON q.id = b.quote_id
    JOIN provider_profiles p ON p.id = b.provider_id
    JOIN users u_prov ON u_prov.id = p.user_id
    JOIN users u_cust ON u_cust.id = b.customer_id
    WHERE d.id = $1
  `;

  const res = await db.query(query, [disputeId]);
  if (!res.rows || res.rows.length === 0) {
    const error = new Error('Dispute not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return res.rows[0];
}

/**
 * Update dispute status and resolution notes (Admin only).
 */
async function updateDisputeStatus({ disputeId, status, resolutionNotes }) {
  // 1. Check if dispute exists
  const existingRes = await db.query(
    `SELECT * FROM disputes WHERE id = $1`,
    [disputeId]
  );

  if (!existingRes.rows || existingRes.rows.length === 0) {
    const error = new Error('Dispute not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  // 2. Perform update
  const notesToSet = resolutionNotes !== undefined ? (resolutionNotes ? sanitizeText(resolutionNotes) : null) : existingRes.rows[0].resolution_notes;
  const updateRes = await db.query(
    `UPDATE disputes
     SET status = $1,
         resolution_notes = $2,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [status, notesToSet, disputeId]
  );

  return updateRes.rows[0];
}

/**
 * Get disputes for a specific booking (Booking participants or Admin).
 */
async function getBookingDisputes(bookingId, { userId, userRole }) {
  const bookingRes = await db.query(
    `SELECT b.id, b.customer_id, pp.user_id AS provider_user_id
     FROM bookings b
     JOIN provider_profiles pp ON pp.id = b.provider_id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (!bookingRes.rows || bookingRes.rows.length === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];
  const isCustomer = booking.customer_id === userId;
  const isProvider = booking.provider_user_id === userId;
  const isAdmin = userRole === 'admin';

  if (!isCustomer && !isProvider && !isAdmin) {
    const error = new Error('You are not authorized to view disputes for this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const res = await db.query(
    `SELECT d.*, u.name AS raiser_name, u.role AS raiser_role
     FROM disputes d
     JOIN users u ON u.id = d.raised_by
     WHERE d.booking_id = $1
     ORDER BY d.created_at DESC`,
    [bookingId]
  );

  return res.rows || [];
}

module.exports = {
  createDispute,
  getDisputes,
  getDisputeById,
  updateDisputeStatus,
  getBookingDisputes
};
