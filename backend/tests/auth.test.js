const request = require('supertest');
const jwt = require('jsonwebtoken');
const { newDb } = require('pg-mem');
const crypto = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');
const authService = require('../src/auth/auth.service');

describe('Module 1 - Task 2: Auth OTP API Endpoints', () => {
  let memDb;

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
    `);

    // Mock db.query with memDb
    jest.spyOn(db, 'query').mockImplementation(async (text, params) => {
      // Replace $1, $2 with escaped values for pg-mem
      let queryStr = text;
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          const val = typeof param === 'string' ? `'${param}'` : param;
          queryStr = queryStr.replace(new RegExp(`\\$${index + 1}`, 'g'), val);
        });
      }
      try {
        const result = memDb.public.many(queryStr);
        return { rows: result, rowCount: result.length };
      } catch (err) {
        // If it's an insert or update that returns nothing, run it
        memDb.public.none(queryStr);
        return { rows: [], rowCount: 1 };
      }
    });
  });

  beforeEach(() => {
    authService._resetStore();
  });

  describe('POST /api/v1/auth/otp/request', () => {
    it('returns 200 with { success: true } for valid phone_number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ phone_number: '+919999900001' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({ success: true });
    });

    it('returns 400 VALIDATION_ERROR if phone_number is missing or too short', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ phone_number: '123' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
      expect(res.body.error).toHaveProperty('message');
    });

    it('enforces rate limit: 6th request within 1 hour returns 429 RATE_LIMIT_EXCEEDED', async () => {
      const phone = '+919999900099';
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/v1/auth/otp/request')
          .send({ phone_number: phone });
        expect(res.statusCode).toEqual(200);
      }

      // 6th request
      const rateLimitedRes = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ phone_number: phone });

      expect(rateLimitedRes.statusCode).toEqual(429);
      expect(rateLimitedRes.body.error.code).toEqual('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('POST /api/v1/auth/otp/verify', () => {
    it('returns 400 VALIDATION_ERROR when role is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          phone_number: '+919999900001',
          otp: '123456',
          role: 'invalid_role'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('VALIDATION_ERROR');
    });

    it('returns 400 INVALID_OTP when OTP is incorrect', async () => {
      // In non-production, 123456 is accepted as test OTP. Passing 000000 will fail.
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          phone_number: '+919999900001',
          otp: '000000',
          role: 'customer'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('INVALID_OTP');
    });

    it('creates customer user and returns valid JWT and user object on correct OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          phone_number: '+919999900001',
          otp: '123456',
          role: 'customer'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.phone_number).toEqual('+919999900001');
      expect(res.body.user.role).toEqual('customer');
      expect(res.body.user.is_active).toBe(true);

      // Verify JWT payload
      const decoded = jwt.verify(
        res.body.token,
        process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long'
      );
      expect(decoded.phone_number).toEqual('+919999900001');
      expect(decoded.role).toEqual('customer');
    });

    it('creates provider user and returns valid JWT on correct OTP', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({
          phone_number: '+919999900002',
          otp: '123456',
          role: 'provider'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.user.phone_number).toEqual('+919999900002');
      expect(res.body.user.role).toEqual('provider');
    });
  });
});
