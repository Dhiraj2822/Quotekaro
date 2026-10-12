const { z } = require('zod');

const createPaymentSchema = z.object({
  method: z.enum(['upi', 'card', 'cash'], {
    errorMap: () => ({ message: "Payment method must be 'upi', 'card', or 'cash'" })
  })
});

const verifyPaymentSchema = z.object({
  booking_id: z.string().uuid({ message: 'Invalid booking UUID' }),
  razorpay_order_id: z.string().min(1, { message: 'razorpay_order_id is required' }),
  razorpay_payment_id: z.string().min(1, { message: 'razorpay_payment_id is required' }),
  razorpay_signature: z.string().min(1, { message: 'razorpay_signature is required' })
});

module.exports = {
  createPaymentSchema,
  verifyPaymentSchema
};
