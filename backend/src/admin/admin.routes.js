const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const { getProvidersQuerySchema, updateKycSchema } = require('./admin.validation');
const { handleGetProviders, handleUpdateKyc, handleGetAnalytics } = require('./admin.controller');
const { getDisputesQuerySchema, updateDisputeSchema } = require('./disputes.validation');
const { handleGetDisputes, handleGetDisputeById, handleUpdateDispute } = require('./disputes.controller');

// All admin routes strictly require valid JWT and admin role per 07_SECURITY.md §1
router.use(authenticate);
router.use(requireRole(['admin']));

router.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Admin access verified',
    admin_id: req.user.id
  });
});

// GET /admin/providers?kyc_status=pending — Provider KYC verification queue per 05_API_SPEC.md
router.get('/providers', validateQuery(getProvidersQuerySchema), handleGetProviders);

// PATCH /admin/providers/:id/kyc — Admin KYC approval/rejection per 05_API_SPEC.md
router.patch('/providers/:id/kyc', validate(updateKycSchema), handleUpdateKyc);

// GET /admin/disputes — List all disputes per 05_API_SPEC.md
router.get('/disputes', validateQuery(getDisputesQuerySchema), handleGetDisputes);

// GET /admin/disputes/:id — Get dispute details
router.get('/disputes/:id', handleGetDisputeById);

// PATCH /admin/disputes/:id — Resolve or update dispute per 05_API_SPEC.md
router.patch('/disputes/:id', validate(updateDisputeSchema), handleUpdateDispute);

// GET /admin/analytics — City-wise booking counts, GMV, active providers per 05_API_SPEC.md
router.get('/analytics', handleGetAnalytics);

// Category Bounds Management per 06_UIUX_SPEC.md §4.4 & 07_SECURITY.md §4
const { getCategoryBounds, updateCategoryBounds } = require('./category_bounds.service');
const {
  getAdminCustomers,
  updateCustomerStatus,
  getAdminBookings,
  reassignBookingProvider,
  getAdminSubscriptions
} = require('./admin_management.service');
const { getAvailableCoupons } = require('../coupons/coupons.service');

// Customers Management
router.get('/customers', async (req, res, next) => {
  try {
    const { search, status, limit, offset } = req.query;
    const customers = await getAdminCustomers({ search, status, limit, offset });
    res.status(200).json({ count: customers.length, customers });
  } catch (err) {
    next(err);
  }
});

router.patch('/customers/:id/status', async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const result = await updateCustomerStatus(req.params.id, is_active);
    res.status(200).json({ success: true, customer: result });
  } catch (err) {
    next(err);
  }
});

// Bookings Management
router.get('/bookings', async (req, res, next) => {
  try {
    const { status, category, limit, offset } = req.query;
    const bookings = await getAdminBookings({ status, category, limit, offset });
    res.status(200).json({ count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
});

router.patch('/bookings/:id/assign', async (req, res, next) => {
  try {
    const { provider_id } = req.body;
    const result = await reassignBookingProvider(req.params.id, provider_id);
    res.status(200).json({ success: true, booking: result });
  } catch (err) {
    next(err);
  }
});

// AI Maintenance & Subscriptions Management
router.get('/subscriptions', async (req, res, next) => {
  try {
    const data = await getAdminSubscriptions();
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

// Marketing & Coupons Management
router.get('/coupons', async (req, res, next) => {
  try {
    const coupons = await getAvailableCoupons();
    res.status(200).json({ count: coupons.length, coupons });
  } catch (err) {
    next(err);
  }
});

router.get('/category-bounds', (req, res) => {
  const bounds = getCategoryBounds();
  res.status(200).json({ bounds });
});

router.patch('/category-bounds/:category', (req, res, next) => {
  try {
    const { category } = req.params;
    const { min_price_paise, max_price_paise } = req.body;
    const updated = updateCategoryBounds(category, { min_price_paise, max_price_paise });
    res.status(200).json({ bounds: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
