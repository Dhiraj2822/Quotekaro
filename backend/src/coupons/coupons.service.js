const db = require('../config/db');

const DEFAULT_COUPONS = [
  {
    code: 'WELCOME50',
    title: 'First Home Service Discount',
    description: 'Flat ₹50 off on your first service booking with QuoteKaro',
    discount_type: 'flat',
    discount_value: 5000, // ₹50.00
    min_order_paise: 29900,
    max_discount_paise: 5000,
    is_active: true
  },
  {
    code: 'PUNE20',
    title: 'Pune Super Saver',
    description: 'Get 20% off on all deep cleaning & AC maintenance orders',
    discount_type: 'percentage',
    discount_value: 20, // 20%
    min_order_paise: 49900,
    max_discount_paise: 25000, // max ₹250
    is_active: true
  },
  {
    code: 'CARE100',
    title: 'Home Care Subscriber Bonus',
    description: 'Special ₹100 flat discount for active subscription members',
    discount_type: 'flat',
    discount_value: 10000, // ₹100.00
    min_order_paise: 59900,
    max_discount_paise: 10000,
    is_active: true
  }
];

async function getAvailableCoupons() {
  try {
    const res = await db.query('SELECT * FROM coupons WHERE is_active = true');
    if (res && res.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (err) {
    // Memory
  }
  return DEFAULT_COUPONS;
}

async function validateAndApplyCoupon(code, orderAmountPaise) {
  const coupons = await getAvailableCoupons();
  const coupon = coupons.find((c) => c.code.toUpperCase() === (code || '').trim().toUpperCase());

  if (!coupon || !coupon.is_active) {
    const err = new Error('Invalid or expired coupon code');
    err.statusCode = 400;
    err.code = 'INVALID_COUPON';
    throw err;
  }

  if (coupon.min_order_paise && orderAmountPaise < coupon.min_order_paise) {
    const minRs = Math.round(coupon.min_order_paise / 100);
    const err = new Error(`Coupon applies only on minimum order of ₹${minRs}`);
    err.statusCode = 400;
    err.code = 'MIN_ORDER_NOT_MET';
    throw err;
  }

  let discountPaise = 0;
  if (coupon.discount_type === 'flat') {
    discountPaise = coupon.discount_value;
  } else if (coupon.discount_type === 'percentage') {
    discountPaise = Math.round((orderAmountPaise * coupon.discount_value) / 100);
    if (coupon.max_discount_paise && discountPaise > coupon.max_discount_paise) {
      discountPaise = coupon.max_discount_paise;
    }
  }

  // Ensure discount doesn't exceed order amount
  discountPaise = Math.min(orderAmountPaise, discountPaise);
  const finalPricePaise = orderAmountPaise - discountPaise;

  return {
    valid: true,
    code: coupon.code,
    title: coupon.title,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    discount_paise: discountPaise,
    final_price_paise: finalPricePaise
  };
}

module.exports = {
  getAvailableCoupons,
  validateAndApplyCoupon,
  DEFAULT_COUPONS
};
