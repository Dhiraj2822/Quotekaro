const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  handleRegisterAppliance,
  handleGetAppliances,
  handleGetPlans,
  handleGetUserSubscription,
  handleSubscribe,
  handleCancelSubscription,
  handleGetDashboard
} = require('./maintenance.controller');

// Public endpoint to view available plans
router.get('/plans', handleGetPlans);

// Authenticated endpoints
router.use(authenticate);

// Appliance Registration & Inspection
router.post('/appliances', handleRegisterAppliance);
router.get('/appliances', handleGetAppliances);

// User Subscription
router.get('/subscription', handleGetUserSubscription);
router.post('/subscription/subscribe', handleSubscribe);
router.post('/subscription/cancel', handleCancelSubscription);

// Maintenance Hub Dashboard
router.get('/dashboard', handleGetDashboard);

module.exports = router;
