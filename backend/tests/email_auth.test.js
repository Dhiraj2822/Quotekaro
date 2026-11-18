const request = require('supertest');
const { newDb } = require('pg-mem');
const crypto = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');

describe('Email OTP Authentication & Production Phone Linking', () => {
  let memDb;

  beforeAll(() => {
    process.env.ALLOW_DEV_OTP = 'true';
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
        phone_number VARCHAR(15) UNIQUE,
        role user_role NOT NULL,
        name VARCHAR(100),
        email VARCHAR(150),
        profile_photo_url TEXT,
        city VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        is_phone_verified BOOLEAN DEFAULT false,
        is_email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    jest.spyOn(db, 'query').mockImplementation(async (text, params) => {
      let queryStr = text;
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          const placeholder = new RegExp(`\\$${index + 1}(?!\\d)`, 'g');
          let val = 'NULL';
          if (param === null || param === undefined) {
            val = 'NULL';
          } else if (typeof param === 'string') {
            val = `'${param.replace(/'/g, "''")}'`;
          } else if (typeof param === 'boolean') {
            val = param ? 'TRUE' : 'FALSE';
          } else if (typeof param === 'number') {
            val = param.toString();
          } else {
            val = `'${JSON.stringify(param).replace(/'/g, "''")}'`;
          }
          queryStr = queryStr.replace(placeholder, val);
        });
      }
      try {
        const res = memDb.public.query(queryStr);
        return {
          rows: res.rows || [],
          rowCount: res.rowCount !== undefined ? res.rowCount : (res.rows ? res.rows.length : 0)
        };
      } catch (err) {
        return { rows: [], rowCount: 0 };
      }
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('rejects invalid email address with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/email/otp/request')
      .send({ email: 'not-an-email' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe('INVALID_EMAIL');
  });

  it('successfully requests email OTP for valid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/email/otp/request')
      .send({ email: 'customer@example.com' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('verifies email OTP with dev OTP and flags requires_phone_setup', async () => {
    const res = await request(app)
      .post('/api/v1/auth/email/otp/verify')
      .send({ email: 'customer@example.com', otp: '123456', role: 'customer' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('customer@example.com');
    expect(res.body.requires_phone_setup).toBe(true);

    // Now test linking a valid 10-digit Indian mobile number
    const linkRes = await request(app)
      .post('/api/v1/auth/profile/link-phone')
      .set('Authorization', `Bearer ${res.body.token}`)
      .send({ phone_number: '9876543210' });

    expect(linkRes.statusCode).toBe(200);
    expect(linkRes.body.success).toBe(true);
    expect(linkRes.body.user.phone_number).toBe('+919876543210');
    expect(linkRes.body.user.is_phone_verified).toBe(true);
  });

  it('rejects invalid phone format when linking phone', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/email/otp/verify')
      .send({ email: 'test2@example.com', otp: '123456', role: 'customer' });

    const linkRes = await request(app)
      .post('/api/v1/auth/profile/link-phone')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({ phone_number: '12345' });

    expect(linkRes.statusCode).toBe(400);
    expect(linkRes.body.error.code).toBe('INVALID_PHONE_NUMBER');
  });
});
