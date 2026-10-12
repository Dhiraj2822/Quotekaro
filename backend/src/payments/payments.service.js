const db = require('../config/db');
const razorpayService = require('./razorpay.service');

/**
 * Payments Service
 * Handles payment intents, gateway webhook events, and verification per 05_API_SPEC.md & 07_SECURITY.md §3
 */

/**
 * Creates or retrieves payment intent for a booking (UPI, Card, or Cash)
 */
async function createPaymentIntent({ bookingId, method, user }) {
  // 1. Fetch booking with quote price and customer info
  const bookingQuery = `
    SELECT 
      b.id,
      b.customer_id,
      b.provider_id,
      b.status AS booking_status,
      q.price_paise
    FROM bookings b
    JOIN quotes q ON b.quote_id = q.id
    WHERE b.id = $1
  `;
  const bookingRes = await db.query(bookingQuery, [bookingId]);

  if (bookingRes.rowCount === 0) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  const booking = bookingRes.rows[0];

  // 2. Authorization check
  if (user && user.role === 'customer' && booking.customer_id !== user.id) {
    const error = new Error('You are not authorized to pay for this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  if (booking.booking_status === 'cancelled') {
    const error = new Error('Cannot create payment for a cancelled booking');
    error.statusCode = 400;
    error.code = 'BOOKING_CANCELLED';
    throw error;
  }

  const amountPaise = parseInt(booking.price_paise, 10);

  // 3. Check for existing payment
  const existingPaymentRes = await db.query(
    'SELECT * FROM payments WHERE booking_id = $1',
    [bookingId]
  );
  const existingPayment = existingPaymentRes.rowCount > 0 ? existingPaymentRes.rows[0] : null;

  if (existingPayment && existingPayment.status === 'completed') {
    const error = new Error('Payment already completed for this booking');
    error.statusCode = 400;
    error.code = 'PAYMENT_ALREADY_COMPLETED';
    throw error;
  }

  // 4. Handle Cash Payment
  if (method === 'cash') {
    let payment;
    if (existingPayment) {
      const updateRes = await db.query(
        `UPDATE payments 
         SET method = 'cash', gateway_txn_id = NULL, updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [existingPayment.id]
      );
      payment = updateRes.rows[0];
    } else {
      const insertRes = await db.query(
        `INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
         VALUES ($1, $2, 'cash', NULL, 'pending')
         RETURNING *`,
        [bookingId, amountPaise]
      );
      payment = insertRes.rows[0];
    }

    return {
      payment_intent: {
        payment_id: payment.id,
        booking_id: bookingId,
        amount_paise: amountPaise,
        method: 'cash',
        gateway: null,
        order_id: null,
        status: payment.status
      }
    };
  }

  // 5. Handle Digital Payment (UPI or Card via Razorpay)
  const order = await razorpayService.createOrder({
    amountPaise,
    currency: 'INR',
    receipt: bookingId,
    notes: {
      booking_id: bookingId,
      customer_id: booking.customer_id,
      method
    }
  });

  let payment;
  if (existingPayment) {
    const updateRes = await db.query(
      `UPDATE payments 
       SET method = $1, gateway_txn_id = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [method, order.id, existingPayment.id]
    );
    payment = updateRes.rows[0];
  } else {
    const insertRes = await db.query(
      `INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [bookingId, amountPaise, method, order.id]
    );
    payment = insertRes.rows[0];
  }

  return {
    payment_intent: {
      payment_id: payment.id,
      booking_id: bookingId,
      amount_paise: amountPaise,
      method,
      gateway: 'razorpay',
      order_id: order.id,
      key_id: razorpayService.keyId,
      currency: order.currency || 'INR',
      status: payment.status
    }
  };
}

/**
 * Processes Razorpay Webhook Callbacks per 05_API_SPEC.md & 07_SECURITY.md §3
 */
async function processWebhook({ rawBody, signature, event }) {
  if (!signature) {
    const error = new Error('Missing webhook signature header');
    error.statusCode = 400;
    error.code = 'INVALID_SIGNATURE';
    throw error;
  }

  const isValid = razorpayService.verifyWebhookSignature({
    rawBody: rawBody || JSON.stringify(event),
    signature
  });

  if (!isValid) {
    const error = new Error('Invalid webhook signature');
    error.statusCode = 400;
    error.code = 'INVALID_SIGNATURE';
    throw error;
  }

  const eventType = event?.event;
  const paymentEntity = event?.payload?.payment?.entity;
  const orderEntity = event?.payload?.order?.entity;

  const orderId = paymentEntity?.order_id || orderEntity?.id;
  const txnId = paymentEntity?.id;
  const bookingId = paymentEntity?.notes?.booking_id;

  if (eventType === 'payment.captured' || eventType === 'order.paid') {
    // Find payment record
    let findQuery = `SELECT * FROM payments WHERE gateway_txn_id = $1`;
    let params = [orderId || txnId];

    if (!orderId && bookingId) {
      findQuery = `SELECT * FROM payments WHERE booking_id = $1`;
      params = [bookingId];
    }

    const res = await db.query(findQuery, params);
    if (res.rowCount > 0) {
      const payment = res.rows[0];
      await db.query(
        `UPDATE payments 
         SET status = 'completed', gateway_txn_id = COALESCE($1, gateway_txn_id), updated_at = NOW() 
         WHERE id = $2`,
        [txnId || orderId, payment.id]
      );
    }
  } else if (eventType === 'payment.failed') {
    const res = await db.query(
      `SELECT * FROM payments WHERE gateway_txn_id = $1`,
      [orderId || txnId]
    );
    if (res.rowCount > 0) {
      await db.query(
        `UPDATE payments SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [res.rows[0].id]
      );
    }
  }

  return { received: true, status: 'processed', event: eventType };
}

/**
 * Verifies client-side Razorpay payment completion
 */
async function verifyAndCompletePayment({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature, user }) {
  const isValid = razorpayService.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature
  });

  if (!isValid) {
    const error = new Error('Invalid payment signature');
    error.statusCode = 400;
    error.code = 'INVALID_SIGNATURE';
    throw error;
  }

  const paymentRes = await db.query(
    'SELECT * FROM payments WHERE booking_id = $1',
    [bookingId]
  );

  let payment;
  if (paymentRes.rowCount > 0) {
    const updateRes = await db.query(
      `UPDATE payments 
       SET status = 'completed', gateway_txn_id = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [razorpayPaymentId, paymentRes.rows[0].id]
    );
    payment = updateRes.rows[0];
  } else {
    // Fetch quote price if record wasn't created prior
    const quoteRes = await db.query(
      'SELECT q.price_paise FROM bookings b JOIN quotes q ON b.quote_id = q.id WHERE b.id = $1',
      [bookingId]
    );
    const pricePaise = quoteRes.rowCount > 0 ? quoteRes.rows[0].price_paise : 0;

    const insertRes = await db.query(
      `INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
       VALUES ($1, $2, 'upi', $3, 'completed')
       RETURNING *`,
      [bookingId, pricePaise, razorpayPaymentId]
    );
    payment = insertRes.rows[0];
  }

  return {
    status: 'completed',
    payment
  };
}

/**
 * Retrieve payment details for a booking
 */
async function getPaymentByBookingId({ bookingId, user }) {
  const res = await db.query('SELECT * FROM payments WHERE booking_id = $1', [bookingId]);
  if (res.rowCount === 0) {
    const error = new Error('Payment not found for this booking');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }
  return res.rows[0];
}

module.exports = {
  createPaymentIntent,
  processWebhook,
  verifyAndCompletePayment,
  getPaymentByBookingId
};
