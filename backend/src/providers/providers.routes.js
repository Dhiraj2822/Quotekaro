const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  kycUploadSchema,
  updateAvailabilitySchema,
  updateServiceAreaSchema
} = require('./providers.validation');
const {
  handleKycUpload,
  handleUpdateAvailability,
  handleUpdateServiceArea,
  handleGetProvider
} = require('./providers.controller');

// All provider endpoints require valid JWT authentication
router.use(authenticate);

// POST /providers/kyc — provider submits KYC document
router.post('/kyc', requireRole(['provider']), validate(kycUploadSchema), handleKycUpload);

// PATCH /providers/:id/availability — toggle availability with KYC gate
router.patch('/:id/availability', requireRole(['provider', 'admin']), validate(updateAvailabilitySchema), handleUpdateAvailability);

// PATCH /providers/:id/service-area — configure categories, radius, location
router.patch('/:id/service-area', requireRole(['provider', 'admin']), validate(updateServiceAreaSchema), handleUpdateServiceArea);

// GET /providers/:id — get provider profile
router.get('/:id', handleGetProvider);

// Wallet Endpoints per 05_API_SPEC.md
const { topupWalletSchema } = require('../wallet/wallet.validation');
const { handleGetWallet, handleTopupWallet } = require('../wallet/wallet.controller');

// GET /providers/:id/wallet — view balance & ledger history
router.get('/:id/wallet', requireRole(['provider', 'admin']), handleGetWallet);

// POST /providers/:id/wallet/topup — top up prepaid wallet
router.post('/:id/wallet/topup', requireRole(['provider', 'admin']), validate(topupWalletSchema), handleTopupWallet);

// GET /providers/:id/ratings — get provider ratings summary & reviews
const { handleGetProviderRatings } = require('../ratings/ratings.controller');
router.get('/:id/ratings', handleGetProviderRatings);

module.exports = router;

