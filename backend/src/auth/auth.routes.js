const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { requestOtpSchema, verifyOtpSchema } = require('./auth.validation');
const { handleRequestOtp, handleVerifyOtp, handleGetMe } = require('./auth.controller');

router.post('/otp/request', validate(requestOtpSchema), handleRequestOtp);
router.post('/otp/verify', validate(verifyOtpSchema), handleVerifyOtp);
router.get('/me', authenticate, handleGetMe);

module.exports = router;
