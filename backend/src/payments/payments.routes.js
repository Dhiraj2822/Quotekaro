const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createPaymentSchema, verifyPaymentSchema } = require('./payments.validation');
const {
  handleCreatePaymentIntent,
  handleWebhook,
  handleVerifyPayment,
  handleGetPayment
} = require('./payments.controller');

// POST /payments/webhook per 05_API_SPEC.md (gateway callback with signature verification)
router.post('/webhook', handleWebhook);

// Authenticated routes
router.use(authenticate);

// POST /payments/verify — verify Razorpay checkout callback
router.post('/verify', validate(verifyPaymentSchema), handleVerifyPayment);

// GET /payments/booking/:id — get payment details for a booking
router.get('/booking/:id', handleGetPayment);

// POST /payments/booking/:id — create payment intent for booking
router.post('/booking/:id', validate(createPaymentSchema), handleCreatePaymentIntent);

module.exports = router;
