const { z } = require('zod');

const requestOtpSchema = z.object({
  phone_number: z
    .string({ required_error: 'phone_number is required' })
    .min(10, 'phone_number must be at least 10 digits')
    .max(15, 'phone_number cannot exceed 15 characters')
});

const verifyOtpSchema = z.object({
  phone_number: z
    .string({ required_error: 'phone_number is required' })
    .min(10, 'phone_number must be at least 10 digits')
    .max(15, 'phone_number cannot exceed 15 characters'),
  otp: z
    .string({ required_error: 'otp is required' })
    .min(4, 'otp must be at least 4 digits')
    .max(6, 'otp cannot exceed 6 digits'),
  role: z.enum(['customer', 'provider', 'admin'], {
    required_error: 'role is required',
    invalid_type_error: "role must be one of: 'customer', 'provider', 'admin'"
  })
});

module.exports = {
  requestOtpSchema,
  verifyOtpSchema
};
