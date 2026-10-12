const { z } = require('zod');

const createRatingSchema = z.object({
  rating_honesty: z
    .number({ required_error: 'rating_honesty is required' })
    .int('rating_honesty must be an integer')
    .min(1, 'rating_honesty must be between 1 and 5')
    .max(5, 'rating_honesty must be between 1 and 5'),
  rating_punctuality: z
    .number({ required_error: 'rating_punctuality is required' })
    .int('rating_punctuality must be an integer')
    .min(1, 'rating_punctuality must be between 1 and 5')
    .max(5, 'rating_punctuality must be between 1 and 5'),
  rating_quality: z
    .number({ required_error: 'rating_quality is required' })
    .int('rating_quality must be an integer')
    .min(1, 'rating_quality must be between 1 and 5')
    .max(5, 'rating_quality must be between 1 and 5'),
  review_text: z
    .string()
    .trim()
    .max(1000, 'review_text cannot exceed 1000 characters')
    .optional()
    .nullable(),
});

module.exports = {
  createRatingSchema,
};
