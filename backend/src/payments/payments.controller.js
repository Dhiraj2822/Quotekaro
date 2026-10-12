const paymentsService = require('./payments.service');

/**
 * Payments Controller per 05_API_SPEC.md
 */

/**
 * POST /bookings/:id/payment
 */
async function handleCreatePaymentIntent(req, res, next) {
  try {
    const bookingId = req.params.id || req.params.bookingId;
    const { method } = req.body;
    const user = req.user;

    const result = await paymentsService.createPaymentIntent({
      bookingId,
      method,
      user
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /payments/webhook
 */
async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const event = req.body;

    const result = await paymentsService.processWebhook({
      rawBody,
      signature,
      event
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /payments/verify (client-side checkout callback verification)
 */
async function handleVerifyPayment(req, res, next) {
  try {
    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const user = req.user;

    const result = await paymentsService.verifyAndCompletePayment({
      bookingId: booking_id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      user
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /payments/booking/:id
 */
async function handleGetPayment(req, res, next) {
  try {
    const bookingId = req.params.id || req.params.bookingId;
    const user = req.user;
    const payment = await paymentsService.getPaymentByBookingId({ bookingId, user });
    res.status(200).json({ payment });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleCreatePaymentIntent,
  handleWebhook,
  handleVerifyPayment,
  handleGetPayment
};
