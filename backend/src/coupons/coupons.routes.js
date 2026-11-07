const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { handleGetCoupons, handleApplyCoupon } = require('./coupons.controller');

// View available coupons
router.get('/', handleGetCoupons);

// Validate and apply coupon code (requires auth)
router.post('/apply', authenticate, handleApplyCoupon);

module.exports = router;
