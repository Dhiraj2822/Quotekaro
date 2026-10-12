const crypto = require('crypto');

/**
 * Razorpay Payment Gateway Service
 * Handles order creation, signature verification, and webhook processing
 * for UPI / Card transactions per 02_TRD.md §1 & 07_SECURITY.md §3.
 */
class RazorpayService {
  constructor(config = {}) {
    this.keyId = config.keyId || process.env.PAYMENT_KEY_ID || 'rzp_test_mock_id';
    this.keySecret = config.keySecret || process.env.PAYMENT_KEY_SECRET || 'your_razorpay_secret';
    this.webhookSecret = config.webhookSecret || process.env.PAYMENT_WEBHOOK_SECRET || 'your_webhook_signature_secret';
    this.useLiveApi = config.useLiveApi || process.env.RAZORPAY_USE_LIVE_API === 'true';
    this.apiBaseUrl = 'https://api.razorpay.com/v1';
  }

  /**
   * Creates a payment order for UPI / Card checkout
   * @param {Object} params
   * @param {number} params.amountPaise - Amount in Indian paise (e.g. 50000 for ₹500.00)
   * @param {string} [params.currency='INR'] - Currency code
   * @param {string} params.receipt - Internal receipt / booking ID reference
   * @param {Object} [params.notes={}] - Key-value metadata
   * @returns {Promise<Object>} Razorpay order details
   */
  async createOrder({ amountPaise, currency = 'INR', receipt, notes = {} }) {
    if (!amountPaise || typeof amountPaise !== 'number' || amountPaise <= 0) {
      throw new Error('Valid positive amount_paise is required for order creation');
    }

    // If live API mode is enabled and credentials are provided
    if (this.useLiveApi && this.keyId && this.keySecret && !this.keyId.includes('mock')) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
        const response = await fetch(`${this.apiBaseUrl}/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            amount: Math.round(amountPaise),
            currency,
            receipt: receipt ? String(receipt).slice(0, 40) : `rcpt_${Date.now()}`,
            notes
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Razorpay API error: ${errorData.error?.description || response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        // Fall back to sandbox mock response in development/test if network fails
        if (process.env.NODE_ENV === 'production') {
          throw err;
        }
      }
    }

    // Sandbox / Test Mode Mock Generator
    const orderId = `order_${crypto.randomBytes(10).toString('hex')}`;
    return {
      id: orderId,
      entity: 'order',
      amount: Math.round(amountPaise),
      amount_paid: 0,
      amount_due: Math.round(amountPaise),
      currency: currency,
      receipt: receipt ? String(receipt).slice(0, 40) : `rcpt_${Date.now()}`,
      status: 'created',
      attempts: 0,
      notes: notes,
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Verifies Razorpay checkout payment signature
   * Formula: hmac_sha256(order_id + "|" + payment_id, secret) == signature
   * Uses timingSafeEqual to prevent timing attacks per 07_SECURITY.md §3
   */
  verifyPaymentSignature({ orderId, paymentId, signature, secret = null }) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const signingSecret = secret || this.keySecret;
    const expectedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const signatureBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== signatureBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuf, signatureBuf);
    } catch {
      return false;
    }
  }

  /**
   * Helper to generate payment signature for testing & client mock callbacks
   */
  generatePaymentSignature({ orderId, paymentId, secret = null }) {
    const signingSecret = secret || this.keySecret;
    return crypto
      .createHmac('sha256', signingSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
  }

  /**
   * Verifies Razorpay webhook signature per 07_SECURITY.md §3
   * @param {Object} params
   * @param {string|Buffer} params.rawBody - Exact raw HTTP request body string or Buffer
   * @param {string} params.signature - Value from 'x-razorpay-signature' header
   * @param {string} [params.secret] - Optional override webhook secret
   * @returns {boolean} True if signature is cryptographically valid
   */
  verifyWebhookSignature({ rawBody, signature, secret = null }) {
    if (!rawBody || !signature) {
      return false;
    }

    const signingSecret = secret || this.webhookSecret;
    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    const expectedSignature = crypto
      .createHmac('sha256', signingSecret)
      .update(bodyString)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const signatureBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== signatureBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(expectedBuf, signatureBuf);
    } catch {
      return false;
    }
  }

  /**
   * Helper to generate webhook signature for testing
   */
  generateWebhookSignature({ payload, secret = null }) {
    const signingSecret = secret || this.webhookSecret;
    const bodyString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto
      .createHmac('sha256', signingSecret)
      .update(bodyString)
      .digest('hex');
  }
}

module.exports = new RazorpayService();
module.exports.RazorpayService = RazorpayService;
