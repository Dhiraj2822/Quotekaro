const db = require('../config/db');
const { calculateDistanceKm } = require('../utils/geo');
const { getDistanceAndETA } = require('../utils/maps');
const { deductCommission } = require('../wallet/wallet.service');

// In-memory live tracking location cache (bookingId -> { lat, lng, updatedAt })
const liveLocationCache = new Map();

/**
 * Get booking by ID with full populated details for job, customer, provider, and quote.
 * Enforces authorization checks per 08_TESTING_STRATEGY.md §2.7:
 * A customer cannot view another customer's booking; a provider can only view their own bookings.
 */
async function getBookingById({ bookingId, user }) {
  const query = `
    SELECT 
      b.id,
      b.job_id,
      b.quote_id,
      b.customer_id,
      b.provider_id,
      b.status,
      b.scheduled_at,
      b.completed_at,
      b.before_photo_url,
      b.after_photo_url,
      b.created_at,
      b.updated_at,
      -- Job details
      j.category AS job_category,
      j.urgency_type AS job_urgency_type,
      j.description AS job_description,
      j.area AS job_area,
      j.lat AS job_lat,
      j.lng AS job_lng,
      j.photo_urls AS job_photo_urls,
      j.status AS job_status,
      -- Customer user details
      c.name AS customer_name,
      c.phone_number AS customer_phone,
      -- Provider details
      pp.user_id AS provider_user_id,
      pu.name AS provider_name,
      pu.phone_number AS provider_phone,
      pp.avg_rating_honesty,
      pp.avg_rating_punctuality,
      pp.avg_rating_quality,
      -- Quote details (if present)
      q.price_paise AS quote_price_paise,
      q.eta_minutes AS quote_eta_minutes,
      q.message AS quote_message
    FROM bookings b
    JOIN jobs j ON b.job_id = j.id
    JOIN users c ON b.customer_id = c.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    JOIN users pu ON pp.user_id = pu.id
    LEFT JOIN quotes q ON b.quote_id = q.id
    WHERE b.id = $1
  `;

  const res = await db.query(query, [bookingId]);
  if (res.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const row = res.rows[0];

  // Authorization check (08_TESTING_STRATEGY.md §2.7)
  if (user.role === 'customer' && row.customer_id !== user.id) {
    const error = new Error('You are not authorized to view this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (user.role === 'provider' && row.provider_user_id !== user.id) {
    const error = new Error('You are not authorized to view this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  return formatBookingResponse(row);
}

/**
 * Get list of bookings for the current authenticated user (customer or provider).
 */
async function getBookingsForUser({ user }) {
  let query;
  let params;

  if (user.role === 'customer') {
    query = `
      SELECT 
        b.id,
        b.job_id,
        b.quote_id,
        b.customer_id,
        b.provider_id,
        b.status,
        b.scheduled_at,
        b.completed_at,
        b.before_photo_url,
        b.after_photo_url,
        b.created_at,
        b.updated_at,
        j.category AS job_category,
        j.urgency_type AS job_urgency_type,
        j.description AS job_description,
        j.area AS job_area,
        j.lat AS job_lat,
        j.lng AS job_lng,
        j.photo_urls AS job_photo_urls,
        j.status AS job_status,
        c.name AS customer_name,
        c.phone_number AS customer_phone,
        pp.user_id AS provider_user_id,
        pu.name AS provider_name,
        pu.phone_number AS provider_phone,
        pp.avg_rating_honesty,
        pp.avg_rating_punctuality,
        pp.avg_rating_quality,
        q.price_paise AS quote_price_paise,
        q.eta_minutes AS quote_eta_minutes,
        q.message AS quote_message
      FROM bookings b
      JOIN jobs j ON b.job_id = j.id
      JOIN users c ON b.customer_id = c.id
      JOIN provider_profiles pp ON b.provider_id = pp.id
      JOIN users pu ON pp.user_id = pu.id
      LEFT JOIN quotes q ON b.quote_id = q.id
      WHERE b.customer_id = $1
      ORDER BY b.created_at DESC
    `;
    params = [user.id];
  } else if (user.role === 'provider') {
    query = `
      SELECT 
        b.id,
        b.job_id,
        b.quote_id,
        b.customer_id,
        b.provider_id,
        b.status,
        b.scheduled_at,
        b.completed_at,
        b.before_photo_url,
        b.after_photo_url,
        b.created_at,
        b.updated_at,
        j.category AS job_category,
        j.urgency_type AS job_urgency_type,
        j.description AS job_description,
        j.area AS job_area,
        j.lat AS job_lat,
        j.lng AS job_lng,
        j.photo_urls AS job_photo_urls,
        j.status AS job_status,
        c.name AS customer_name,
        c.phone_number AS customer_phone,
        pp.user_id AS provider_user_id,
        pu.name AS provider_name,
        pu.phone_number AS provider_phone,
        pp.avg_rating_honesty,
        pp.avg_rating_punctuality,
        pp.avg_rating_quality,
        q.price_paise AS quote_price_paise,
        q.eta_minutes AS quote_eta_minutes,
        q.message AS quote_message
      FROM bookings b
      JOIN jobs j ON b.job_id = j.id
      JOIN users c ON b.customer_id = c.id
      JOIN provider_profiles pp ON b.provider_id = pp.id
      JOIN users pu ON pp.user_id = pu.id
      LEFT JOIN quotes q ON b.quote_id = q.id
      WHERE pp.user_id = $1
      ORDER BY b.created_at DESC
    `;
    params = [user.id];
  } else {
    // Admin: all bookings
    query = `
      SELECT 
        b.id,
        b.job_id,
        b.quote_id,
        b.customer_id,
        b.provider_id,
        b.status,
        b.scheduled_at,
        b.completed_at,
        b.before_photo_url,
        b.after_photo_url,
        b.created_at,
        b.updated_at,
        j.category AS job_category,
        j.urgency_type AS job_urgency_type,
        j.description AS job_description,
        j.area AS job_area,
        j.lat AS job_lat,
        j.lng AS job_lng,
        j.photo_urls AS job_photo_urls,
        j.status AS job_status,
        c.name AS customer_name,
        c.phone_number AS customer_phone,
        pp.user_id AS provider_user_id,
        pu.name AS provider_name,
        pu.phone_number AS provider_phone,
        pp.avg_rating_honesty,
        pp.avg_rating_punctuality,
        pp.avg_rating_quality,
        q.price_paise AS quote_price_paise,
        q.eta_minutes AS quote_eta_minutes,
        q.message AS quote_message
      FROM bookings b
      JOIN jobs j ON b.job_id = j.id
      JOIN users c ON b.customer_id = c.id
      JOIN provider_profiles pp ON b.provider_id = pp.id
      JOIN users pu ON pp.user_id = pu.id
      LEFT JOIN quotes q ON b.quote_id = q.id
      ORDER BY b.created_at DESC
    `;
    params = [];
  }

  const res = await db.query(query, params);
  return res.rows.map(formatBookingResponse);
}

function formatBookingResponse(row) {
  return {
    id: row.id,
    job_id: row.job_id,
    quote_id: row.quote_id,
    customer_id: row.customer_id,
    provider_id: row.provider_id,
    status: row.status,
    scheduled_at: row.scheduled_at,
    completed_at: row.completed_at,
    before_photo_url: row.before_photo_url || (row.job_photo_urls && row.job_photo_urls.length > 0 ? row.job_photo_urls[0] : null),
    after_photo_url: row.after_photo_url,
    created_at: row.created_at,
    updated_at: row.updated_at,
    price_paise: row.quote_price_paise || null,
    eta_minutes: row.quote_eta_minutes || null,
    job: {
      id: row.job_id,
      category: row.job_category,
      urgency_type: row.job_urgency_type,
      description: row.job_description,
      area: row.job_area,
      lat: row.job_lat ? parseFloat(row.job_lat) : null,
      lng: row.job_lng ? parseFloat(row.job_lng) : null,
      photo_urls: row.job_photo_urls || [],
      status: row.job_status
    },
    customer: {
      id: row.customer_id,
      name: row.customer_name,
      phone_number: row.customer_phone
    },
    provider: {
      id: row.provider_id,
      user_id: row.provider_user_id,
      name: row.provider_name,
      phone_number: row.provider_phone,
      avg_rating_honesty: row.avg_rating_honesty ? parseFloat(row.avg_rating_honesty) : 5.0,
      avg_rating_punctuality: row.avg_rating_punctuality ? parseFloat(row.avg_rating_punctuality) : 5.0,
      avg_rating_quality: row.avg_rating_quality ? parseFloat(row.avg_rating_quality) : 5.0
    }
  };
}

/**
 * Update booking status (en_route, in_progress, completed, cancelled) per 05_API_SPEC.md
 * Enforces role-based state machine and authorization:
 * - Assigned provider or admin can update status to 'en_route' or 'in_progress'
 * - Customer can only cancel
 */
async function updateBookingStatus({ bookingId, status, lat, lng, beforePhotoUrl, user }) {
  const bookingRes = await db.query(
    `SELECT b.id, b.job_id, b.status, b.customer_id, b.provider_id, pp.user_id AS provider_user_id
     FROM bookings b
     JOIN provider_profiles pp ON b.provider_id = pp.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRes.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const currentBooking = bookingRes.rows[0];

  // Authorization check (07_SECURITY.md §1 & 08_TESTING_STRATEGY.md §2.7)
  if (user.role === 'customer') {
    if (currentBooking.customer_id !== user.id) {
      const error = new Error('You are not authorized to update this booking');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
    if (status !== 'cancelled') {
      const error = new Error('Customers can only cancel a booking');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  } else if (user.role === 'provider') {
    if (currentBooking.provider_user_id !== user.id) {
      const error = new Error('You are not the assigned provider for this booking');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  // Update booking status in database
  if (beforePhotoUrl !== undefined && beforePhotoUrl !== null) {
    await db.query(
      `UPDATE bookings SET status = $1, before_photo_url = $2, updated_at = NOW() WHERE id = $3`,
      [status, beforePhotoUrl, bookingId]
    );
  } else {
    await db.query(
      `UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, bookingId]
    );
  }

  // Synchronize jobs table status
  if (status === 'in_progress') {
    await db.query(
      `UPDATE jobs SET status = 'in_progress', updated_at = NOW() WHERE id = $1`,
      [currentBooking.job_id]
    );
  } else if (status === 'cancelled') {
    await db.query(
      `UPDATE jobs SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [currentBooking.job_id]
    );
  }

  // Record live GPS ping if coordinates provided with status update
  if (lat != null && lng != null) {
    liveLocationCache.set(bookingId, {
      lat: Number(lat),
      lng: Number(lng),
      updatedAt: Date.now()
    });
  }

  return getBookingById({ bookingId, user });
}

/**
 * Record live GPS location ping for a booking (provider-facing)
 */
async function updateBookingLocation({ bookingId, lat, lng, user }) {
  const bookingRes = await db.query(
    `SELECT b.id, pp.user_id AS provider_user_id
     FROM bookings b
     JOIN provider_profiles pp ON b.provider_id = pp.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRes.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];
  if (user.role === 'provider' && booking.provider_user_id !== user.id) {
    const error = new Error('You are not the assigned provider for this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  liveLocationCache.set(bookingId, {
    lat: Number(lat),
    lng: Number(lng),
    updatedAt: Date.now()
  });

  return {
    success: true,
    booking_id: bookingId,
    provider_lat: Number(lat),
    provider_lng: Number(lng),
    updated_at: new Date().toISOString()
  };
}

/**
 * Track live booking location & ETA
 * Per 05_API_SPEC.md: GET /bookings/:id/track -> { provider_lat, provider_lng, eta_minutes }
 */
async function getBookingTrack({ bookingId, user }) {
  const query = `
    SELECT 
      b.id,
      b.status,
      b.customer_id,
      pp.user_id AS provider_user_id,
      pp.base_location_lat AS provider_base_lat,
      pp.base_location_lng AS provider_base_lng,
      j.lat AS job_lat,
      j.lng AS job_lng,
      q.eta_minutes AS quote_eta_minutes
    FROM bookings b
    JOIN jobs j ON b.job_id = j.id
    JOIN provider_profiles pp ON b.provider_id = pp.id
    LEFT JOIN quotes q ON b.quote_id = q.id
    WHERE b.id = $1
  `;

  const res = await db.query(query, [bookingId]);
  if (res.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const row = res.rows[0];

  // Authorization check (Customer of booking, assigned provider, or admin)
  if (user.role === 'customer' && row.customer_id !== user.id) {
    const error = new Error('You are not authorized to track this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (user.role === 'provider' && row.provider_user_id !== user.id) {
    const error = new Error('You are not authorized to track this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // 1. Check live location ping from cache
  const cachedPing = liveLocationCache.get(bookingId);

  let providerLat = cachedPing ? cachedPing.lat : (row.provider_base_lat ? parseFloat(row.provider_base_lat) : null);
  let providerLng = cachedPing ? cachedPing.lng : (row.provider_base_lng ? parseFloat(row.provider_base_lng) : null);

  const jobLat = row.job_lat ? parseFloat(row.job_lat) : null;
  const jobLng = row.job_lng ? parseFloat(row.job_lng) : null;

  let distanceKm = null;
  let etaMinutes = row.quote_eta_minutes || 15;
  let routeProvider = 'default';

  if (providerLat != null && providerLng != null && jobLat != null && jobLng != null) {
    const route = await getDistanceAndETA({
      originLat: providerLat,
      originLng: providerLng,
      destLat: jobLat,
      destLng: jobLng
    });
    distanceKm = route.distanceKm;
    if (route.etaMinutes != null) {
      etaMinutes = route.etaMinutes;
    }
    routeProvider = route.provider;
  }

  return {
    provider_lat: providerLat,
    provider_lng: providerLng,
    eta_minutes: etaMinutes,
    status: row.status,
    distance_km: distanceKm,
    destination_lat: jobLat,
    destination_lng: jobLng,
    route_provider: routeProvider
  };
}

/**
 * Send an in-app chat message for a booking (Module 5 Task 3)
 * Enforces: Only the booking's customer, assigned provider, or admin can participate.
 */
async function createBookingMessage({ bookingId, message, user }) {
  // 1. Verify booking exists and fetch participants
  const bookingRes = await db.query(
    `SELECT b.id, b.customer_id, pp.user_id AS provider_user_id
     FROM bookings b
     JOIN provider_profiles pp ON b.provider_id = pp.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRes.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];

  // 2. Authorization check (07_SECURITY.md §1)
  if (user.role === 'customer' && booking.customer_id !== user.id) {
    const error = new Error('You are not authorized to send messages in this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (user.role === 'provider' && booking.provider_user_id !== user.id) {
    const error = new Error('You are not authorized to send messages in this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // 3. Insert message
  const sanitizedText = message.trim();
  const insertRes = await db.query(
    `INSERT INTO booking_messages (booking_id, sender_id, message)
     VALUES ($1, $2, $3)
     RETURNING id, booking_id, sender_id, message, is_read, created_at`,
    [bookingId, user.id, sanitizedText]
  );

  const row = insertRes.rows[0];

  return {
    id: row.id,
    booking_id: row.booking_id,
    sender_id: row.sender_id,
    sender_name: user.name || (user.role === 'customer' ? 'Customer' : 'Service Partner'),
    sender_role: user.role,
    message: row.message,
    is_read: row.is_read,
    created_at: row.created_at
  };
}

/**
 * Retrieve chat messages for a booking (polling-based per 09_MODULE_BUILD_PLAN.md Task 3)
 */
async function getBookingMessages({ bookingId, since, user }) {
  // 1. Verify booking exists and authorization
  const bookingRes = await db.query(
    `SELECT b.id, b.customer_id, pp.user_id AS provider_user_id
     FROM bookings b
     JOIN provider_profiles pp ON b.provider_id = pp.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRes.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];

  if (user.role === 'customer' && booking.customer_id !== user.id) {
    const error = new Error('You are not authorized to view messages in this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (user.role === 'provider' && booking.provider_user_id !== user.id) {
    const error = new Error('You are not authorized to view messages in this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  // 2. Fetch messages ordered chronologically
  let query = `
    SELECT 
      m.id,
      m.booking_id,
      m.sender_id,
      u.name AS sender_name,
      u.role AS sender_role,
      m.message,
      m.is_read,
      m.created_at
    FROM booking_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.booking_id = $1
  `;
  const params = [bookingId];

  if (since) {
    query += ` AND m.created_at > $2`;
    params.push(since);
  }

  query += ` ORDER BY m.created_at ASC`;

  const res = await db.query(query, params);
  return res.rows;
}

/**
 * Complete booking per 05_API_SPEC.md:
 * POST /bookings/:id/complete
 * Automatically triggers platform wallet commission deduction for BOTH cash and digital payments.
 */
async function completeBooking({ bookingId, afterPhotoUrl = null, beforePhotoUrl = null, user }) {
  // 1. Fetch booking with quote and provider details
  const bookingRes = await db.query(
    `SELECT 
       b.id,
       b.job_id,
       b.quote_id,
       b.customer_id,
       b.provider_id,
       b.status,
       b.completed_at,
       b.before_photo_url,
       b.after_photo_url,
       pp.user_id AS provider_user_id,
       pp.wallet_balance_paise,
       pp.is_available,
       q.price_paise
     FROM bookings b
     JOIN provider_profiles pp ON b.provider_id = pp.id
     JOIN quotes q ON b.quote_id = q.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRes.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];

  // 2. Authorization check: provider, customer, or admin
  if (user) {
    if (user.role === 'provider' && booking.provider_user_id !== user.id) {
      const error = new Error('You are not authorized to complete this booking');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
    if (user.role === 'customer' && booking.customer_id !== user.id) {
      const error = new Error('You are not authorized to complete this booking');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  // 3. Status checks
  if (booking.status === 'completed') {
    const error = new Error('Booking is already completed');
    error.statusCode = 400;
    error.code = 'BOOKING_ALREADY_COMPLETED';
    throw error;
  }

  if (booking.status === 'cancelled') {
    const error = new Error('Cannot complete a cancelled booking');
    error.statusCode = 400;
    error.code = 'BOOKING_CANCELLED';
    throw error;
  }

  // 4. Update booking to completed with proof of work photos
  const finalPhotoUrl = afterPhotoUrl || booking.after_photo_url || null;
  const finalBeforePhotoUrl = beforePhotoUrl || booking.before_photo_url || null;
  await db.query(
    `UPDATE bookings 
     SET status = 'completed', completed_at = NOW(), after_photo_url = $1, before_photo_url = COALESCE($2, before_photo_url), updated_at = NOW() 
     WHERE id = $3`,
    [finalPhotoUrl, finalBeforePhotoUrl, bookingId]
  );

  // Synchronize jobs table
  await db.query(
    `UPDATE jobs SET status = 'completed', updated_at = NOW() WHERE id = $1`,
    [booking.job_id]
  );

  // 5. Update cash payment if pending or unrecorded
  const paymentRes = await db.query(
    'SELECT * FROM payments WHERE booking_id = $1',
    [bookingId]
  );
  if (paymentRes.rowCount > 0) {
    const payment = paymentRes.rows[0];
    if (payment.method === 'cash' && payment.status === 'pending') {
      await db.query(
        `UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [payment.id]
      );
    }
  } else {
    // If no payment record existed, create completed cash payment record
    const pricePaise = parseInt(booking.price_paise, 10);
    await db.query(
      `INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
       VALUES ($1, $2, 'cash', NULL, 'completed')`,
      [bookingId, pricePaise]
    );
  }

  // 6. Universal Commission Deduction (applies to BOTH cash and digital!)
  const pricePaise = parseInt(booking.price_paise, 10);
  const walletResult = await deductCommission({
    providerId: booking.provider_id,
    bookingId: booking.id,
    bookingPricePaise: pricePaise
  });

  // 7. Clear live location cache
  liveLocationCache.delete(bookingId);

  // 8. Return formatted updated booking with wallet deduction info
  const updatedBookingRes = await db.query(
    `SELECT 
       b.id,
       b.job_id,
       b.quote_id,
       b.customer_id,
       b.provider_id,
       b.status,
       b.scheduled_at,
       b.completed_at,
       b.before_photo_url,
       b.after_photo_url,
       b.created_at,
       b.updated_at,
       j.category AS job_category,
       j.urgency_type AS job_urgency_type,
       j.description AS job_description,
       j.area AS job_area,
       j.lat AS job_lat,
       j.lng AS job_lng,
       j.photo_urls AS job_photo_urls,
       j.status AS job_status,
       c.name AS customer_name,
       c.phone_number AS customer_phone,
       pp.user_id AS provider_user_id,
       pu.name AS provider_name,
       pu.phone_number AS provider_phone,
       pp.avg_rating_honesty,
       pp.avg_rating_punctuality,
       pp.avg_rating_quality,
       q.price_paise AS quote_price_paise,
       q.eta_minutes AS quote_eta_minutes,
       q.message AS quote_message
     FROM bookings b
     JOIN jobs j ON b.job_id = j.id
     JOIN users c ON b.customer_id = c.id
     JOIN provider_profiles pp ON b.provider_id = pp.id
     JOIN users pu ON pp.user_id = pu.id
     LEFT JOIN quotes q ON b.quote_id = q.id
     WHERE b.id = $1`,
    [bookingId]
  );

  return {
    booking: formatBookingResponse(updatedBookingRes.rows[0]),
    wallet_deduction: {
      commission_paise: walletResult.commissionPaise,
      amount_paise: -walletResult.commissionPaise,
      balance_after_paise: walletResult.newBalance,
      is_available: walletResult.isAvailable,
      below_threshold: walletResult.belowThreshold
    }
  };
}

/**
 * Update before or after proof-of-work photos for a booking per 09_MODULE_BUILD_PLAN.md Module 7 Task 3.
 */
async function updateBookingPhotos({ bookingId, beforePhotoUrl, afterPhotoUrl, user }) {
  const bookingRes = await db.query(
    `SELECT b.id, b.customer_id, b.provider_id, b.before_photo_url, b.after_photo_url, pp.user_id AS provider_user_id
     FROM bookings b
     JOIN provider_profiles pp ON b.provider_id = pp.id
     WHERE b.id = $1`,
    [bookingId]
  );

  if (bookingRes.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];

  if (user && user.role !== 'admin') {
    if (user.role === 'customer' && booking.customer_id !== user.id) {
      const error = new Error('You are not authorized to update photos for this booking');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
    if (user.role === 'provider' && booking.provider_user_id !== user.id) {
      const error = new Error('You are not authorized to update photos for this booking');
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      throw error;
    }
  }

  const newBefore = beforePhotoUrl !== undefined ? beforePhotoUrl : booking.before_photo_url;
  const newAfter = afterPhotoUrl !== undefined ? afterPhotoUrl : booking.after_photo_url;

  await db.query(
    `UPDATE bookings
     SET before_photo_url = $1, after_photo_url = $2, updated_at = NOW()
     WHERE id = $3`,
    [newBefore, newAfter, bookingId]
  );

  return getBookingById({ bookingId, user });
}

module.exports = {
  getBookingById,
  getBookingsForUser,
  updateBookingStatus,
  updateBookingLocation,
  getBookingTrack,
  createBookingMessage,
  getBookingMessages,
  completeBooking,
  updateBookingPhotos,
  formatBookingResponse,
  liveLocationCache
};
