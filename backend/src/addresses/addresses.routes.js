const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  handleGetAddresses,
  handleAddAddress,
  handleDeleteAddress
} = require('./addresses.controller');

router.use(authenticate);

router.get('/', handleGetAddresses);
router.post('/', handleAddAddress);
router.delete('/:id', handleDeleteAddress);

module.exports = router;

