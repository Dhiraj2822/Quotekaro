const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const JWT_SECRET = process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Module 1 - Task 3: RBAC & Authorization Tests (08_TESTING_STRATEGY §2.7-2.8)', () => {
  const customerToken = makeToken({
    id: '11111111-1111-1111-1111-111111111111',
    phone_number: '+919999900001',
    role: 'customer'
  });

  const providerToken = makeToken({
    id: '22222222-2222-2222-2222-222222222222',
    phone_number: '+919999900002',
    role: 'provider'
  });

  const adminToken = makeToken({
    id: '33333333-3333-3333-3333-333333333333',
    phone_number: '+919999900003',
    role: 'admin'
  });

  describe('Admin Endpoint Protection (08_TESTING_STRATEGY.md §2.8)', () => {
    it('blocks unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/ping');
      expect(res.statusCode).toEqual(401);
      expect(res.body.error.code).toEqual('UNAUTHORIZED');
    });

    it('blocks requests with invalid or tampered token with 401 INVALID_TOKEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Authorization', 'Bearer invalid_tampered_jwt_token');

      expect(res.statusCode).toEqual(401);
      expect(res.body.error.code).toEqual('INVALID_TOKEN');
    });

    it('blocks a provider from accessing any /admin/* endpoint with 403 FORBIDDEN (Test Case 8)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('blocks a customer from accessing any /admin/* endpoint with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('allows an admin to access /admin/ping with 200 OK', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body.admin_id).toEqual('33333333-3333-3333-3333-333333333333');
    });
  });
});
