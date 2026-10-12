const { z } = require('zod');

const updateUserSchema = z.object({
  name: z.string().max(100, 'name cannot exceed 100 characters').optional(),
  email: z.string().email('Invalid email address').max(150, 'email cannot exceed 150 characters').optional().nullable(),
  city: z.string().max(50, 'city cannot exceed 50 characters').optional().nullable(),
  profile_photo_url: z.string().url('Invalid profile photo URL').optional().nullable()
}).strict({
  message: 'Unexpected fields provided in update payload'
});

module.exports = {
  updateUserSchema
};
