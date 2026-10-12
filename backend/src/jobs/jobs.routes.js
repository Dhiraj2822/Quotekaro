const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const { createJobSchema, getJobsQuerySchema, nearbyJobsQuerySchema } = require('./jobs.validation');
const {
  handleCreateJob,
  handleGetJob,
  handleGetJobs,
  handleGetNearbyJobs
} = require('./jobs.controller');
const {
  submitQuoteSchema,
  getQuotesQuerySchema,
  acceptQuoteSchema,
  handlePostQuote,
  handleGetQuotes,
  handleAcceptQuote,
  handleAutoMatchJob
} = require('../quotes');

// All job operations require authentication
router.use(authenticate);

// POST /jobs — Customer posts a job
router.post('/', requireRole(['customer']), validate(createJobSchema), handleCreateJob);

// GET /jobs/nearby — Provider-facing open jobs matching provider's category & service area
// NOTE: Must be mounted before /:id route to prevent route collision
router.get('/nearby', requireRole(['provider', 'admin']), validateQuery(nearbyJobsQuerySchema), handleGetNearbyJobs);

// GET /jobs?customer_id= — Get jobs list
router.get('/', validateQuery(getJobsQuerySchema), handleGetJobs);

// GET /jobs/:id — Get job details
router.get('/:id', handleGetJob);

// POST /jobs/:id/quotes — Provider submits a quote
router.post('/:id/quotes', requireRole(['provider']), validate(submitQuoteSchema), handlePostQuote);

// GET /jobs/:id/quotes — Customer views quotes sorted by blended score or price
router.get('/:id/quotes', validateQuery(getQuotesQuerySchema), handleGetQuotes);

// POST /jobs/:id/accept-quote — Customer accepts a quote and confirms booking
router.post('/:id/accept-quote', requireRole(['customer', 'admin']), validate(acceptQuoteSchema), handleAcceptQuote);

// POST /jobs/:id/auto-match — Customer or admin triggers urgent job auto-match
router.post('/:id/auto-match', requireRole(['customer', 'admin']), handleAutoMatchJob);

module.exports = router;


