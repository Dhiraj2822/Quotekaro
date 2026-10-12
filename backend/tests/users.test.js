const request = require('supertest');
const jwt = require('jsonwebtoken');
const { newDb } = require('pg-mem');
const crypto = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Module 1 - Task 4: User Profile Endpoints & Security Checks', () => {
  let memDb;
  const customerAId = '11111111-1111-1111-1111-111111111111';
  const customerBId = '22222222-2222-2222-2222-222222222222';
  const adminId = '33333333-3333-3333-3333-333333333333';

  const customerAToken = makeToken({ id: customerAId, phone_number: '+919999900001', role: 'customer' });
  const customerBToken = makeToken({ id: customerBId, phone_number: '+919999900002', role: 'customer' });
  const adminToken = makeToken({ id: adminId, phone_number: '+919999900003', role: 'admin' });

  beforeAll(() => {
    memDb = newDb();
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      returns: memDb.public.getType('uuid'),
      implementation: () => crypto.randomUUID()
    });

    memDb.public.none(`
      CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number VARCHAR(15) UNIQUE NOT NULL,
        role user_role NOT NULL,
        name VARCHAR(100),
        email VARCHAR(150),
        profile_photo_url TEXT,
        city VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      INSERT INTO users (id, phone_number, role, name, city)
      VALUES 
        ('${customerAId}', '+919999900001', 'customer', 'Customer Priya', 'Pune'),
        ('${customerBId}', '+919999900002', 'customer', 'Customer Rohan', 'Mumbai'),
        ('${adminId}', '+919999900003', 'admin', 'Super Admin', 'Pune');
    `);

    // Mock db.query using memDb
    jest.spyOn(db, 'query').mockImplementation(async (text, params) => {
      let queryStr = text;
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          const val = param === null ? 'NULL' : (typeof param === 'string' ? `'${param}'` : param);
          queryStr = queryStr.replace(new RegExp(`\\$${index + 1}`, 'g'), val);
        });
      }
      try {
        const result = memDb.public.many(queryStr);
        return { rows: result, rowCount: result.length };
      } catch (err) {
        memDb.public.none(queryStr);
        return { rows: [], rowCount: 1 };
      }
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 UNAUTHORIZED if token is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.statusCode).toEqual(401);
      expect(res.body.error.code).toEqual('UNAUTHORIZED');
    });

    it('returns 200 with current user profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.id).toEqual(customerAId);
      expect(res.body.user.name).toEqual('Customer Priya');
      expect(res.body.user.role).toEqual('customer');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('returns 200 with user profile by id', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${customerBId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.user.id).toEqual(customerBId);
      expect(res.body.user.name).toEqual('Customer Rohan');
    });

    it('returns 404 NOT_FOUND for non-existent user id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/users/${fakeId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.error.code).toEqual('NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/users/:id (08_TESTING_STRATEGY §2.7)', () => {
    it('blocks Customer A from modifying Customer B profile with 403 FORBIDDEN (Test Case 7)', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${customerBId}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ name: 'Hacked Name' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('rejects unexpected fields (e.g. attempting to change role) with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${customerAId}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ role: 'admin' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('VALIDATION_ERROR');
    });

    it('allows Customer A to update their own profile and sanitizes text', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${customerAId}`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          name: '<script>alert("xss")</script>Priya Sharma',
          city: 'Pune West',
          email: 'priya.sharma@example.com'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.user.name).toEqual('Priya Sharma'); // HTML script tags stripped
      expect(res.body.user.city).toEqual('Pune West');
      expect(res.body.user.email).toEqual('priya.sharma@example.com');
    });

    it('allows Admin to modify another user profile', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${customerBId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ city: 'Navi Mumbai' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.user.city).toEqual('Navi Mumbai');
    });
  });
});
