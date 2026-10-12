const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const {
  updateBookingStatusSchema,
  updateBookingLocationSchema,
  createMessageSchema,
  getMessagesQuerySchema,
  completeBookingSchema
} = require('./bookings.validation');
const {
  handleGetBooking,
  handleGetBookings,
  handleUpdateBookingStatus,
  handleUpdateBookingLocation,
  handleGetBookingTrack,
  handleCreateBookingMessage,
  handleGetBookingMessages,
  handleCompleteBooking
} = require('./bookings.controller');

router.use(authenticate);

// GET /bookings — List user's bookings
router.get('/', handleGetBookings);

// GET /bookings/:id — Get details of a specific booking
router.get('/:id', handleGetBooking);

// PATCH /bookings/:id/status — Update status (e.g. en_route, in_progress) per 05_API_SPEC.md
router.patch('/:id/status', validate(updateBookingStatusSchema), handleUpdateBookingStatus);

// POST /bookings/:id/location — Provider pings live GPS coordinates
router.post('/:id/location', validate(updateBookingLocationSchema), handleUpdateBookingLocation);

// GET /bookings/:id/track — Live tracking for customer / provider per 05_API_SPEC.md
router.get('/:id/track', handleGetBookingTrack);

// In-app chat endpoints per 09_MODULE_BUILD_PLAN.md Module 5 Task 3
// POST /bookings/:id/messages — Send chat message
router.post('/:id/messages', validate(createMessageSchema), handleCreateBookingMessage);

// GET /bookings/:id/messages — Retrieve messages (polling-based)
router.get('/:id/messages', validateQuery(getMessagesQuerySchema), handleGetBookingMessages);

// POST /bookings/:id/payment — Create payment intent per 05_API_SPEC.md
const { createPaymentSchema } = require('../payments/payments.validation');
const { handleCreatePaymentIntent } = require('../payments/payments.controller');
router.post('/:id/payment', validate(createPaymentSchema), handleCreatePaymentIntent);

// POST /bookings/:id/complete — Complete booking & trigger wallet commission deduction per 05_API_SPEC.md
router.post('/:id/complete', validate(completeBookingSchema), handleCompleteBooking);

// Rating Endpoints per 05_API_SPEC.md & 09_MODULE_BUILD_PLAN.md Module 7
const { createRatingSchema } = require('../ratings/ratings.validation');
const { handleCreateRating, handleGetBookingRating } = require('../ratings/ratings.controller');

// POST /bookings/:id/rating — Submit 3-axis rating
router.post('/:id/rating', validate(createRatingSchema), handleCreateRating);

// GET /bookings/:id/rating — Get rating for booking
router.get('/:id/rating', handleGetBookingRating);

// Proof of Work Photos per 09_MODULE_BUILD_PLAN.md Module 7 Task 3
const { updateBookingPhotosSchema } = require('./bookings.validation');
const { handleUpdateBookingPhotos } = require('./bookings.controller');

// PATCH /bookings/:id/photos — Update before or after photos
router.patch('/:id/photos', validate(updateBookingPhotosSchema), handleUpdateBookingPhotos);

// Disputes Endpoints per 09_MODULE_BUILD_PLAN.md Module 8 Task 2
const { createDisputeSchema } = require('../admin/disputes.validation');
const { handleCreateDispute, handleGetBookingDisputes } = require('../admin/disputes.controller');

// POST /bookings/:id/disputes — Raise a dispute on a booking
router.post('/:id/disputes', validate(createDisputeSchema), handleCreateDispute);

// GET /bookings/:id/disputes — Get disputes on a booking
router.get('/:id/disputes', handleGetBookingDisputes);

module.exports = router;

