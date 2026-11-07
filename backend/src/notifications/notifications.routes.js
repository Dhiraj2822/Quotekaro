const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  handleGetNotifications,
  handleMarkRead,
  handleMarkAllRead
} = require('./notifications.controller');

router.use(authenticate);

router.get('/', handleGetNotifications);
router.patch('/:id/read', handleMarkRead);
router.post('/read-all', handleMarkAllRead);

module.exports = router;

