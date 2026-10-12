const razorpayService = require('../src/payments/razorpay.service');
const { RazorpayService } = require('../src/payments/razorpay.service');
const crypto = require('crypto');

describe('Module 6 - Task 2: Razorpay Gateway Sandbox Integration & Signature Security', () => {
  describe('Order Creation', () => {
    it('creates a sandbox order with valid order ID, amount in paise, and receipt', async () => {
      const order = await razorpayService.createOrder({
        amountPaise: 45000,
        receipt: 'booking_12345',
        notes: {
          booking_id: 'bkg_uuid_1',
          customer_id: 'cust_uuid_1'
        }
      });

      expect(order).toBeDefined();
      expect(order.id).toMatch(/^order_[a-f0-9]+$/);
      expect(order.amount).toBe(45000);
      expect(order.amount_due).toBe(45000);
      expect(order.currency).toBe('INR');
      expect(order.receipt).toBe('booking_12345');
      expect(order.status).toBe('created');
      expect(order.notes.booking_id).toBe('bkg_uuid_1');
    });

    it('rejects order creation with negative or zero amount', async () => {
      await expect(
        razorpayService.createOrder({ amountPaise: 0, receipt: 'rcpt_fail' })
      ).rejects.toThrow('Valid positive amount_paise is required');

      await expect(
        razorpayService.createOrder({ amountPaise: -500, receipt: 'rcpt_fail' })
      ).rejects.toThrow('Valid positive amount_paise is required');
    });
  });

  describe('Payment Signature Verification (07_SECURITY.md §3)', () => {
    const testSecret = 'secret_test_key_abc123';
    const service = new RazorpayService({ keySecret: testSecret });

    it('verifies genuine payment callback signature successfully', () => {
      const orderId = 'order_test_998877';
      const paymentId = 'pay_test_554433';
      const validSignature = service.generatePaymentSignature({
        orderId,
        paymentId,
        secret: testSecret
      });

      const isValid = service.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: validSignature,
        secret: testSecret
      });

      expect(isValid).toBe(true);
    });

    it('rejects tampered payment ID or order ID', () => {
      const orderId = 'order_test_998877';
      const paymentId = 'pay_test_554433';
      const validSignature = service.generatePaymentSignature({
        orderId,
        paymentId,
        secret: testSecret
      });

      // Tampered order ID
      const invalidOrder = service.verifyPaymentSignature({
        orderId: 'order_test_tampered',
        paymentId,
        signature: validSignature,
        secret: testSecret
      });
      expect(invalidOrder).toBe(false);

      // Tampered payment ID
      const invalidPayment = service.verifyPaymentSignature({
        orderId,
        paymentId: 'pay_test_tampered',
        signature: validSignature,
        secret: testSecret
      });
      expect(invalidPayment).toBe(false);

      // Wrong secret
      const invalidSecret = service.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: validSignature,
        secret: 'wrong_secret_attacker'
      });
      expect(invalidSecret).toBe(false);
    });

    it('handles malformed or missing signatures safely without throwing unhandled exceptions', () => {
      expect(
        service.verifyPaymentSignature({
          orderId: 'order_1',
          paymentId: 'pay_1',
          signature: ''
        })
      ).toBe(false);

      expect(
        service.verifyPaymentSignature({
          orderId: 'order_1',
          paymentId: 'pay_1',
          signature: 'short'
        })
      ).toBe(false);
    });
  });

  describe('Webhook Signature Verification (07_SECURITY.md §3)', () => {
    const webhookSecret = 'whsec_test_secret_xyz789';
    const service = new RazorpayService({ webhookSecret });

    const sampleWebhookPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_captured_01',
            order_id: 'order_test_captured_01',
            amount: 50000,
            status: 'captured',
            method: 'upi'
          }
        }
      }
    };

    it('verifies genuine webhook signature on string payload', () => {
      const rawBody = JSON.stringify(sampleWebhookPayload);
      const signature = service.generateWebhookSignature({
        payload: rawBody,
        secret: webhookSecret
      });

      const isValid = service.verifyWebhookSignature({
        rawBody,
        signature,
        secret: webhookSecret
      });

      expect(isValid).toBe(true);
    });

    it('rejects tampered webhook payload', () => {
      const rawBody = JSON.stringify(sampleWebhookPayload);
      const signature = service.generateWebhookSignature({
        payload: rawBody,
        secret: webhookSecret
      });

      // Attacker tampers with body (e.g. changes amount or event)
      const tamperedBody = rawBody.replace('50000', '10000');
      const isValid = service.verifyWebhookSignature({
        rawBody: tamperedBody,
        signature,
        secret: webhookSecret
      });

      expect(isValid).toBe(false);
    });

    it('rejects forged webhook with invalid signature', () => {
      const rawBody = JSON.stringify(sampleWebhookPayload);
      const forgedSignature = crypto.randomBytes(32).toString('hex');

      const isValid = service.verifyWebhookSignature({
        rawBody,
        signature: forgedSignature,
        secret: webhookSecret
      });

      expect(isValid).toBe(false);
    });
  });
});
