const { z } = require('zod');

const topupWalletSchema = z.object({
  amount_paise: z.number().int().positive({ message: 'amount_paise must be a positive integer' }),
  method: z.enum(['upi', 'card', 'cash']).optional().default('upi')
});

module.exports = {
  topupWalletSchema
};
