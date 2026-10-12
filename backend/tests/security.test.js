const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = require('../src/app');
const authService = require('../src/auth/auth.service');
const { sanitizeText } = require('../src/utils/sanitize');

const JWT_SECRET = process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Module 9 - Task 1: Security Hardening Checklist Verification (07_SECURITY.md)', () => {
  beforeEach(() => {
    authService._resetStore();
  });

  describe('1. Input Sanitization & Stored XSS Prevention (07_SECURITY.md §4)', () => {
    it('strips <script> tags and malicious HTML from user input', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello <b>World</b><img src=x onerror=alert(1)>';
      const clean = sanitizeText(maliciousInput);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('</script>');
      expect(clean).not.toContain('<b>');
      expect(clean).not.toContain('<img');
      expect(clean).toBe('Hello World');
    });

    it('handles benign text and trimming cleanly', () => {
      const benign = '   Leaking kitchen tap and pipe fitting needed.   ';
      expect(sanitizeText(benign)).toBe('Leaking kitchen tap and pipe fitting needed.');
    });
  });

  describe('2. Rate Limiting & Abuse Prevention (07_SECURITY.md §5)', () => {
    it('enforces rate limiting on /auth/otp/request (max 5 requests per hour)', async () => {
      const phone = '+919876543210';

      // First 5 requests should succeed
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/otp/request')
          .send({ phone_number: phone });
        expect(res.status).toBe(200);
      }

      // 6th request within window must be rejected with 429 RATE_LIMIT_EXCEEDED
      const blockedRes = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ phone_number: phone });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(blockedRes.body.error.message).toContain('Too many OTP requests');
    });
  });

  describe('3. Webhook Signature Security (07_SECURITY.md §3)', () => {
    it('rejects an unverified payment webhook with invalid signature (Test Case 9)', async () => {
      const fakePayload = JSON.stringify({ event: 'payment.captured', payload: {} });
      const res = await request(app)
        .post('/api/v1/payments/webhook')
        .set('x-razorpay-signature', 'bogus_tampered_signature_12345')
        .send(fakePayload);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });
  });

  describe('4. Server-Side RBAC Enforcement (07_SECURITY.md §1 & Test Case 8)', () => {
    it('ensures a provider token cannot access any /admin/* endpoint even with valid JWT', async () => {
      const providerToken = makeToken({
        id: '11111111-1111-1111-1111-111111111111',
        phone_number: '+919999900011',
        role: 'provider'
      });

      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('ensures a customer token cannot access any /admin/* endpoint', async () => {
      const customerToken = makeToken({
        id: '22222222-2222-2222-2222-222222222222',
        phone_number: '+919999900022',
        role: 'customer'
      });

      const res = await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows verified admin to access /admin/ping', async () => {
      const adminToken = makeToken({
        id: '33333333-3333-3333-3333-333333333333',
        phone_number: '+919999900033',
        role: 'admin'
      });

      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
