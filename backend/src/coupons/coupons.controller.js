const couponsService = require('./coupons.service');

async function handleGetCoupons(req, res, next) {
  try {
    const coupons = await couponsService.getAvailableCoupons();
    res.status(200).json({ coupons });
  } catch (err) {
    next(err);
  }
}

async function handleApplyCoupon(req, res, next) {
  try {
    const { code, amount_paise } = req.body;
    if (!code || !amount_paise) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Coupon code and amount_paise are required' }
      });
    }
    const result = await couponsService.validateAndApplyCoupon(code, Number(amount_paise));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleGetCoupons,
  handleApplyCoupon
};

