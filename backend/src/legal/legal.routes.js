const express = require('express');
const router = express.Router();
const legalService = require('./legal.service');

router.get('/privacy', async (req, res, next) => {
  try {
    const doc = await legalService.getPrivacyPolicy();
    res.status(200).json(doc);
  } catch (err) {
    next(err);
  }
});

router.get('/terms', async (req, res, next) => {
  try {
    const doc = await legalService.getTermsOfService();
    res.status(200).json(doc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
