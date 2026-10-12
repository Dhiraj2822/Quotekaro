const { z } = require('zod');

// 01_PRD.md §5: Categories in MVP are plumbing, electrical, painting, cleaning only
const ALLOWED_CATEGORIES = ['plumbing', 'electrical', 'painting', 'cleaning'];

const kycUploadSchema = z.object({
  document_url: z
    .string({ required_error: 'document_url is required' })
    .url('document_url must be a valid URL')
}).strict();

const updateAvailabilitySchema = z.object({
  is_available: z.boolean({ required_error: 'is_available is required' })
}).strict();

const updateServiceAreaSchema = z.object({
  categories: z
    .array(
      z.enum(ALLOWED_CATEGORIES, {
        errorMap: () => ({ message: `Categories must be from: ${ALLOWED_CATEGORIES.join(', ')}` })
      })
    )
    .min(1, 'At least one category is required'),
  radius_km: z
    .number({ required_error: 'radius_km is required' })
    .int('radius_km must be an integer')
    .min(1, 'radius_km must be at least 1 km')
    .max(100, 'radius_km cannot exceed 100 km'),
  lat: z
    .number({ required_error: 'lat is required' })
    .min(-90, 'lat must be between -90 and 90')
    .max(90, 'lat must be between -90 and 90'),
  lng: z
    .number({ required_error: 'lng is required' })
    .min(-180, 'lng must be between -180 and 180')
    .max(180, 'lng must be between -180 and 180')
}).strict();

module.exports = {
  ALLOWED_CATEGORIES,
  kycUploadSchema,
  updateAvailabilitySchema,
  updateServiceAreaSchema
};
