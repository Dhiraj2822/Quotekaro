const express = require('express');
const router = express.Router();
const {
  handleGetCategories,
  handleGetServices,
  handleGetServiceDetails
} = require('./catalog.controller');

// Public catalog exploration endpoints
router.get('/categories', handleGetCategories);
router.get('/services', handleGetServices);
router.get('/services/:idOrSlug', handleGetServiceDetails);

module.exports = router;

