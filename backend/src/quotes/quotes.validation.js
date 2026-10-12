const { z } = require('zod');

const submitQuoteSchema = z.object({
  price_paise: z
    .number({ message: 'price_paise is required' })
    .int('price_paise must be an integer')
    .positive('price_paise must be a positive integer'),
  eta_minutes: z
    .number()
    .int('eta_minutes must be an integer')
    .positive('eta_minutes must be a positive integer')
    .optional(),
  message: z
    .string()
    .max(500, 'message cannot exceed 500 characters')
    .optional()
}).strict();

const getQuotesQuerySchema = z.object({
  sort: z.enum(['blended', 'price_asc']).optional().default('blended')
}).strict();

const acceptQuoteSchema = z.object({
  quote_id: z
    .string({ message: 'quote_id is required' })
    .uuid('quote_id must be a valid UUID')
}).strict();

module.exports = {
  submitQuoteSchema,
  getQuotesQuerySchema,
  acceptQuoteSchema
};
