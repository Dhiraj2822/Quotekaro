const db = require('../config/db');
const { getBookingById, formatBookingResponse } = require('./bookings.service');

/**
 * Generate a random 6-digit OTP for service start/completion
 */
function generate6DigitOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a direct booking from catalog service / package / addons
 */
async function createDirectBooking(user, data) {
  const {
    service_id,
    service_name,
    category = 'cleaning',
    package_id,
    package_name,
    scheduled_date,
    time_slot = '10:00 AM - 12:00 PM',
    address_id,
    address,
    area = 'Kothrud',
    city = 'Pune',
    lat = 18.5074,
    lng = 73.8077,
    items = [],
    total_price_paise,
    discount_paise = 0,
    coupon_code = null,
    payment_method = 'cash'
  } = data;

  // 1. Find a verified provider in the requested category with active balance
  let providerId = null;
  const provQuery = `
    SELECT pp.id, pp.user_id, u.name
    FROM provider_profiles pp
    JOIN users u ON pp.user_id = u.id
    WHERE pp.kyc_status = 'approved'
      AND $1 = ANY(pp.categories)
      AND pp.wallet_balance_paise >= 10000
    ORDER BY (pp.avg_rating_honesty + pp.avg_rating_punctuality + pp.avg_rating_quality) DESC NULLS LAST
    LIMIT 1
  `;

  try {
    const provRes = await db.query(provQuery, [category.toLowerCase()]);
    if (provRes && provRes.rows && provRes.rows.length > 0) {
      providerId = provRes.rows[0].id;
    }
  } catch (err) {
    // Fallback if custom table structure in memory
  }

  // If no category-specific provider found, select any verified provider
  if (!providerId) {
    try {
      const anyProv = await db.query(
        "SELECT id FROM provider_profiles WHERE kyc_status = 'approved' LIMIT 1"
      );
      if (anyProv && anyProv.rows && anyProv.rows.length > 0) {
        providerId = anyProv.rows[0].id;
      }
    } catch (_) {}
  }

  // Fallback demo provider ID if none exist
  if (!providerId) {
    providerId = '30000000-0000-0000-0000-000000000001';
  }

  // 2. Create the associated Job in database
  const jobDescription = `${service_name || 'Home Service'} - ${package_name || 'Standard Package'} (Time: ${time_slot})`;
  const jobRes = await db.query(`
    INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
    VALUES ($1, $2, 'planned', $3, $4, $5, $6, 'booked')
    RETURNING id
  `, [
    user.id,
    category.toLowerCase(),
    jobDescription,
    area,
    lat,
    lng
  ]);

  const jobId = jobRes.rows[0].id;

  // 3. Generate start and completion OTPs
  const startOtp = generate6DigitOtp();
  const completionOtp = generate6DigitOtp();
  const scheduledTimestamp = scheduled_date ? new Date(scheduled_date).toISOString() : new Date().toISOString();

  // 4. Create the Booking
  const bookingRes = await db.query(`
    INSERT INTO bookings (
      job_id, customer_id, provider_id, status, scheduled_at,
      service_id, package_id, address_id, time_slot,
      total_price_paise, discount_paise, coupon_code,
      start_otp, completion_otp, items
    ) VALUES ($1, $2, $3, 'confirmed', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id
  `, [
    jobId,
    user.id,
    providerId,
    scheduledTimestamp,
    service_id || null,
    package_id || null,
    address_id || null,
    time_slot,
    total_price_paise || 49900,
    discount_paise || 0,
    coupon_code || null,
    startOtp,
    completionOtp,
    JSON.stringify(items || [])
  ]);

  const bookingId = bookingRes.rows[0].id;

  // 5. Return populated booking
  return getBookingById({ bookingId, user });
}

/**
 * Reschedule booking
 */
async function rescheduleBooking(user, bookingId, { scheduled_date, time_slot }) {
  const scheduledTimestamp = new Date(scheduled_date).toISOString();
  await db.query(`
    UPDATE bookings
    SET scheduled_at = $1, time_slot = $2, updated_at = NOW()
    WHERE id = $3
  `, [scheduledTimestamp, time_slot, bookingId]);

  return getBookingById({ bookingId, user });
}

/**
 * Cancel booking
 */
async function cancelBooking(user, bookingId, { reason }) {
  await db.query(`
    UPDATE bookings
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = $1
  `, [bookingId]);

  // Update associated job status
  await db.query(`
    UPDATE jobs
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = (SELECT job_id FROM bookings WHERE id = $1)
  `, [bookingId]);

  return getBookingById({ bookingId, user });
}

/**
 * Verify service start with OTP (Provider input)
 */
async function verifyStartOtp(user, bookingId, enteredOtp) {
  const res = await db.query('SELECT start_otp, status FROM bookings WHERE id = $1', [bookingId]);
  if (res.rowCount === 0) {
    const err = new Error('Booking not found');
    err.statusCode = 404;
    throw err;
  }

  const expected = res.rows[0].start_otp || '123456';
  // Allow demo OTP 123456 or matching start_otp
  if (enteredOtp !== expected && enteredOtp !== '123456') {
    const err = new Error('Invalid service start OTP. Please ask the customer for the 6-digit PIN on their screen.');
    err.statusCode = 400;
    err.code = 'INVALID_OTP';
    throw err;
  }

  await db.query(`
    UPDATE bookings
    SET status = 'in_progress', service_started_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `, [bookingId]);

  return getBookingById({ bookingId, user });
}

/**
 * Generate complete digital invoice
 */
async function getDigitalInvoice(user, bookingId) {
  const booking = await getBookingById({ bookingId, user });

  const invoiceNumber = `QK-INV-${booking.id.slice(0, 8).toUpperCase()}`;
  const basePricePaise = booking.price_paise || booking.total_price_paise || 49900;
  const discountPaise = booking.discount_paise || 0;
  const netAmountPaise = Math.max(0, basePricePaise - discountPaise);
  const gstPaise = Math.round(netAmountPaise * 0.18); // 18% GST (9% CGST + 9% SGST)
  const totalPayablePaise = netAmountPaise + gstPaise;

  return {
    invoice_number: invoiceNumber,
    invoice_date: booking.completed_at || booking.created_at,
    booking_id: booking.id,
    status: booking.status === 'completed' ? 'PAID' : 'PENDING',
    customer: {
      name: booking.customer.name,
      phone: booking.customer.phone_number
    },
    provider: {
      name: booking.provider.name,
      phone: booking.provider.phone_number,
      gstin: '27AABCQ9812M1Z4'
    },
    service: {
      category: booking.job.category,
      description: booking.job.description,
      area: booking.job.area
    },
    breakdown: {
      service_fee_paise: basePricePaise,
      discount_paise: discountPaise,
      net_amount_paise: netAmountPaise,
      cgst_9_percent_paise: Math.round(gstPaise / 2),
      sgst_9_percent_paise: Math.round(gstPaise / 2),
      total_tax_paise: gstPaise,
      total_payable_paise: totalPayablePaise
    },
    platform_info: {
      company: 'QuoteKaro Technologies India Pvt. Ltd.',
      city: 'Pune, Maharashtra',
      fssai_msme: 'MH-PUN-2026-9812'
    }
  };
}

module.exports = {
  createDirectBooking,
  rescheduleBooking,
  cancelBooking,
  verifyStartOtp,
  getDigitalInvoice
};
