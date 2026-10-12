const request = require('supertest');
const jwt = require('jsonwebtoken');
const { newDb } = require('pg-mem');
const crypto = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');
const { resetCategoryBounds } = require('../src/admin/category_bounds.service');

const JWT_SECRET = process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Category & Pricing Bounds Management (06_UIUX_SPEC.md §4.4 & 07_SECURITY.md §4)', () => {
  let memDb;
  let adminToken;
  let providerToken;
  let providerUserId;
  let providerProfileId;
  let customerToken;
  let testJobId;

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
        city VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE kyc_status_enum AS ENUM ('pending', 'approved', 'rejected');

      CREATE TABLE IF NOT EXISTS provider_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
        kyc_status kyc_status_enum NOT NULL DEFAULT 'approved',
        categories TEXT[],
        is_available BOOLEAN DEFAULT true,
        wallet_balance_paise INTEGER DEFAULT 50000,
        avg_rating_honesty DECIMAL,
        avg_rating_punctuality DECIMAL,
        avg_rating_quality DECIMAL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE urgency_type_enum AS ENUM ('urgent', 'planned');
      CREATE TYPE job_status_enum AS ENUM ('open', 'quoted', 'booked', 'in_progress', 'completed', 'cancelled');

      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category VARCHAR(30) NOT NULL,
        urgency_type urgency_type_enum NOT NULL,
        description TEXT,
        status job_status_enum NOT NULL DEFAULT 'open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE quote_status_enum AS ENUM ('pending', 'accepted', 'rejected');

      CREATE TABLE IF NOT EXISTS quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
        price_paise INTEGER NOT NULL,
        eta_minutes INTEGER,
        message TEXT,
        status quote_status_enum NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    function executeSql(text, params) {
      let queryStr = text;
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          let val;
          if (param === null || param === undefined) {
            val = 'NULL';
          } else if (Array.isArray(param)) {
            val = param.length === 0 ? 'ARRAY[]::text[]' : `ARRAY[${param.map(p => `'${p}'`).join(', ')}]::text[]`;
          } else if (typeof param === 'string') {
            val = `'${param.replace(/'/g, "''")}'`;
          } else if (typeof param === 'number') {
            val = param.toString();
          } else if (typeof param === 'boolean') {
            val = param ? 'TRUE' : 'FALSE';
          } else {
            val = `'${param}'`;
          }
          const regex = new RegExp(`\\$${index + 1}(?![0-9])`, 'g');
          queryStr = queryStr.replace(regex, val);
        });
      }

      try {
        const result = memDb.public.query(queryStr);
        return {
          rows: result.rows || [],
          rowCount: result.rowCount !== undefined ? result.rowCount : (result.rows ? result.rows.length : 0)
        };
      } catch (err) {
        throw err;
      }
    }

    jest.spyOn(db, 'query').mockImplementation((text, params) => {
      return Promise.resolve(executeSql(text, params));
    });

    // Seed users & provider
    const admin = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900071', 'admin', 'Bounds Admin', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    adminToken = makeToken({ id: admin.id, phone_number: admin.phone_number, role: 'admin' });

    const customer = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900072', 'customer', 'Customer 1', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    customerToken = makeToken({ id: customer.id, phone_number: customer.phone_number, role: 'customer' });

    const provider = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900073', 'provider', 'Provider 1', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    providerUserId = provider.id;
    providerToken = makeToken({ id: provider.id, phone_number: provider.phone_number, role: 'provider' });

    const profile = memDb.public.many(`
      INSERT INTO provider_profiles (user_id, kyc_status, is_available, wallet_balance_paise, categories)
      VALUES ('${providerUserId}', 'approved', true, 50000, ARRAY['plumbing'])
      RETURNING id;
    `)[0];
    providerProfileId = profile.id;

    // Seed test plumbing job
    const job = memDb.public.many(`
      INSERT INTO jobs (customer_id, category, urgency_type, description)
      VALUES ('${customer.id}', 'plumbing', 'planned', 'Sink leak repair')
      RETURNING id;
    `)[0];
    testJobId = job.id;
  });

  afterAll(() => {
    resetCategoryBounds();
    jest.restoreAllMocks();
  });

  describe('1. Admin Category Bounds Endpoints', () => {
    it('allows admin to fetch current category bounds', async () => {
      const res = await request(app)
        .get('/api/v1/admin/category-bounds')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('bounds');
      expect(res.body.bounds).toHaveProperty('plumbing');
      expect(res.body.bounds).toHaveProperty('electrical');
      expect(res.body.bounds).toHaveProperty('painting');
      expect(res.body.bounds).toHaveProperty('cleaning');
    });

    it('allows admin to update min and max quote bounds for a category', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/category-bounds/plumbing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          min_price_paise: 25000, // ₹250
          max_price_paise: 1000000 // ₹10,000
        });

      expect(res.status).toBe(200);
      expect(res.body.bounds.category).toBe('plumbing');
      expect(res.body.bounds.min_price_paise).toBe(25000);
      expect(res.body.bounds.max_price_paise).toBe(1000000);
    });

    it('rejects update if min_price_paise > max_price_paise', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/category-bounds/plumbing')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          min_price_paise: 500000,
          max_price_paise: 100000
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-admin access with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/category-bounds/plumbing')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ min_price_paise: 10000 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('2. Quote Submission Price Bounds Validation', () => {
    it('rejects a quote with price_paise below min_price_paise with 400 PRICE_OUT_OF_BOUNDS', async () => {
      // Plumbing min was updated to 25000 (₹250); submit ₹100 (10000 paise)
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          price_paise: 10000, // Below ₹250 min
          eta_minutes: 30
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PRICE_OUT_OF_BOUNDS');
      expect(res.body.error.message).toContain('Quote price must be between');
    });

    it('rejects a quote with price_paise above max_price_paise with 400 PRICE_OUT_OF_BOUNDS', async () => {
      // Plumbing max was updated to 1000000 (₹10,000); submit ₹15,000 (1500000 paise)
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          price_paise: 1500000, // Above ₹10,000 max
          eta_minutes: 30
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PRICE_OUT_OF_BOUNDS');
      expect(res.body.error.message).toContain('Quote price must be between');
    });

    it('accepts a quote within valid category price bounds', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          price_paise: 45000, // ₹450 (within ₹250 - ₹10,000)
          eta_minutes: 30,
          message: 'Valid quote within category bounds'
        });

      expect(res.status).toBe(201);
      expect(res.body.quote.price_paise).toBe(45000);
    });
  });
});
