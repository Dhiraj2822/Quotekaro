const { z } = require('zod');

// 01_PRD.md §5 & 06_UIUX_SPEC.md §1: Categories in MVP
const ALLOWED_CATEGORIES = ['plumbing', 'electrical', 'painting', 'cleaning'];
const URGENCY_TYPES = ['urgent', 'planned'];

const createJobSchema = z.object({
  category: z.enum(ALLOWED_CATEGORIES, {
    errorMap: () => ({ message: `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` })
  }),
  urgency_type: z.enum(URGENCY_TYPES, {
    errorMap: () => ({ message: `urgency_type must be one of: ${URGENCY_TYPES.join(', ')}` })
  }),
  description: z
    .string({ required_error: 'description is required' })
    .min(5, 'description must be at least 5 characters')
    .max(1000, 'description cannot exceed 1000 characters'),
  photo_urls: z
    .array(z.string().url('Each photo_url must be a valid URL'))
    .max(5, 'Cannot upload more than 5 photos')
    .optional()
    .default([]),
  area: z
    .string({ required_error: 'area is required' })
    .min(2, 'area is required'),
  lat: z
    .number({ required_error: 'lat is required' })
    .min(-90, 'lat must be between -90 and 90')
    .max(90, 'lat must be between -90 and 90'),
  lng: z
    .number({ required_error: 'lng is required' })
    .min(-180, 'lng must be between -180 and 180')
    .max(180, 'lng must be between -180 and 180')
}).strict().superRefine((data, ctx) => {
  // 06_UIUX_SPEC.md §5: Photo upload is mandatory for non-trivial categories (painting, cleaning)
  if (['painting', 'cleaning'].includes(data.category)) {
    if (!data.photo_urls || data.photo_urls.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['photo_urls'],
        message: `Photo upload is mandatory for ${data.category} jobs`
      });
    }
  }
});

const getJobsQuerySchema = z.object({
  customer_id: z.string().uuid('customer_id must be a valid UUID').optional()
}).strict();

const nearbyJobsQuerySchema = z.object({
  category: z.enum(ALLOWED_CATEGORIES, {
    errorMap: () => ({ message: `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}` })
  }).optional(),
  lat: z.coerce.number().min(-90, 'lat must be between -90 and 90').max(90, 'lat must be between -90 and 90').optional(),
  lng: z.coerce.number().min(-180, 'lng must be between -180 and 180').max(180, 'lng must be between -180 and 180').optional(),
  radius_km: z.coerce.number().int('radius_km must be an integer').min(1, 'radius_km must be at least 1').max(100, 'radius_km cannot exceed 100').optional(),
  area: z.string().optional()
}).strict();

module.exports = {
  ALLOWED_CATEGORIES,
  URGENCY_TYPES,
  createJobSchema,
  getJobsQuerySchema,
  nearbyJobsQuerySchema
};
