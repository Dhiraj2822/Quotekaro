const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { requestOtpSchema, verifyOtpSchema } = require('./auth.validation');
const { handleRequestOtp, handleVerifyOtp, handleGetMe } = require('./auth.controller');
const authService = require('./auth.service');

router.post('/otp/request', validate(requestOtpSchema), handleRequestOtp);
router.post('/otp/verify', validate(verifyOtpSchema), handleVerifyOtp);
router.get('/me', authenticate, handleGetMe);

// 100% Free Email OTP Authentication Flow
router.post('/email/otp/request', async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.requestEmailOtp(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/email/otp/verify', async (req, res, next) => {
  try {
    const { email, otp, role } = req.body;
    const result = await authService.verifyEmailOtp(email, otp, role);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Production Mobile Number Verification & Profile Linking
router.post('/profile/link-phone', authenticate, async (req, res, next) => {
  try {
    const { phone_number } = req.body;
    const result = await authService.linkPhoneNumber(req.user.id, phone_number);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Email registration & login
router.post('/email/register', async (req, res, next) => {
  try {
    const result = await authService.registerWithEmail(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/email/login', async (req, res, next) => {
  try {
    const result = await authService.loginWithEmail(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Google OAuth demo login
router.post('/google', async (req, res, next) => {
  try {
    const result = await authService.loginWithGoogle(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Forgot password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// Account deletion
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    const result = await authService.deleteAccount(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
