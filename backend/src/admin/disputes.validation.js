const { z } = require('zod');

const createDisputeSchema = z.object({
  reason: z.string({
    required_error: 'Dispute reason is required'
  }).trim().min(5, {
    message: 'Dispute reason must be at least 5 characters'
  }).max(2000, {
    message: 'Dispute reason cannot exceed 2000 characters'
  })
}).strict();

const getDisputesQuerySchema = z.object({
  status: z.enum(['open', 'under_review', 'resolved']).optional(),
  limit: z.union([z.string(), z.number()]).optional(),
  offset: z.union([z.string(), z.number()]).optional()
}).passthrough();

const updateDisputeSchema = z.object({
  status: z.enum(['open', 'under_review', 'resolved'], {
    errorMap: () => ({ message: 'Status must be one of: open, under_review, resolved' })
  }),
  resolution_notes: z.string().trim().max(2000, {
    message: 'Resolution notes cannot exceed 2000 characters'
  }).optional().nullable()
}).strict();

module.exports = {
  createDisputeSchema,
  getDisputesQuerySchema,
  updateDisputeSchema
};
