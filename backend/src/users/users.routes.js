const express = require('express');
const router = express.Router();
const { authenticate, requireOwnershipOrAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateUserSchema } = require('./users.validation');
const { handleGetUser, handleUpdateUser } = require('./users.controller');

// All users routes require authentication
router.use(authenticate);

// GET /users/:id
router.get('/:id', handleGetUser);

// PATCH /users/:id — only the user themselves or an admin can update
router.patch('/:id', requireOwnershipOrAdmin(), validate(updateUserSchema), handleUpdateUser);

module.exports = router;
