const { z } = require('zod');

const updateBookingStatusSchema = z.object({
  status: z.enum(['confirmed', 'en_route', 'in_progress', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Status must be one of: confirmed, en_route, in_progress, completed, cancelled' })
  }),
  lat: z.number().optional(),
  lng: z.number().optional(),
  before_photo_url: z.string().optional().nullable()
});

const updateBookingLocationSchema = z.object({
  lat: z.number({ required_error: 'lat is required' }),
  lng: z.number({ required_error: 'lng is required' })
});

const createMessageSchema = z.object({
  message: z.string({ required_error: 'message is required' })
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters')
});

const getMessagesQuerySchema = z.object({
  since: z.string().optional()
});

const completeBookingSchema = z.object({
  after_photo_url: z.string().optional().nullable(),
  before_photo_url: z.string().optional().nullable()
});

const updateBookingPhotosSchema = z.object({
  before_photo_url: z.string().optional().nullable(),
  after_photo_url: z.string().optional().nullable()
}).refine((data) => data.before_photo_url !== undefined || data.after_photo_url !== undefined, {
  message: 'At least one of before_photo_url or after_photo_url must be provided'
});

module.exports = {
  updateBookingStatusSchema,
  updateBookingLocationSchema,
  createMessageSchema,
  getMessagesQuerySchema,
  completeBookingSchema,
  updateBookingPhotosSchema
};

