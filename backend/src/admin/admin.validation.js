const { z } = require('zod');

const getProvidersQuerySchema = z.object({
  kyc_status: z.enum(['pending', 'approved', 'rejected']).optional()
}).strict();

const updateKycSchema = z.object({
  kyc_status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'kyc_status must be either approved or rejected' })
  }),
  rejection_reason: z.string().optional()
}).strict();

module.exports = {
  getProvidersQuerySchema,
  updateKycSchema
};
