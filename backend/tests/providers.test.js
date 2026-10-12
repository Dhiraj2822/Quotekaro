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

describe('Module 2 - Task 2: Provider Profiles, KYC & Availability Gate Endpoints', () => {
  let memDb;
  let providerUserId;
  let providerProfileId;
  let customerUserId;
  let providerToken;
  let customerToken;

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

      CREATE TYPE kyc_status_enum AS ENUM ('pending', 'approved', 'rejected');

      CREATE TABLE IF NOT EXISTS provider_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
        kyc_status kyc_status_enum NOT NULL DEFAULT 'pending',
        kyc_document_url TEXT,
        categories TEXT[],
        service_area_radius_km INTEGER,
        base_location_lat DECIMAL,
        base_location_lng DECIMAL,
        is_available BOOLEAN DEFAULT false,
        avg_rating_honesty DECIMAL,
        avg_rating_punctuality DECIMAL,
        avg_rating_quality DECIMAL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Mock db.query using memDb
    jest.spyOn(db, 'query').mockImplementation(async (text, params) => {
      let queryStr = text;
      if (params && params.length > 0) {
        params.forEach((param, index) => {
          let val;
          if (param === null || param === undefined) {
            val = 'NULL';
          } else if (Array.isArray(param)) {
            val = `ARRAY[${param.map(p => `'${p}'`).join(', ')}]`;
          } else if (typeof param === 'string') {
            val = `'${param.replace(/'/g, "''")}'`;
          } else {
            val = param;
          }
          queryStr = queryStr.replace(new RegExp(`\\$${index + 1}(?!\\d)`, 'g'), val);
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

    const pRes = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900031', 'provider', 'Ramesh Plumber', 'Pune')
      RETURNING id;
    `);
    providerUserId = pRes[0].id;
    providerToken = makeToken({ id: providerUserId, phone_number: '+919999900031', role: 'provider' });

    const cRes = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900032', 'customer', 'Priya Client', 'Pune')
      RETURNING id;
    `);
    customerUserId = cRes[0].id;
    customerToken = makeToken({ id: customerUserId, phone_number: '+919999900032', role: 'customer' });
  });

  describe('POST /api/v1/providers/kyc', () => {
    it('blocks customer role from submitting provider KYC with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/providers/kyc')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ document_url: 'https://storage.quotekaro.com/kyc/doc1.pdf' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('rejects invalid document URL with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/providers/kyc')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ document_url: 'not-a-valid-url' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('VALIDATION_ERROR');
    });

    it('submits KYC document and sets status to pending', async () => {
      const res = await request(app)
        .post('/api/v1/providers/kyc')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ document_url: 'https://storage.quotekaro.com/kyc/ramesh_aadhaar.pdf' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('provider_profile');
      expect(res.body.provider_profile.kyc_status).toEqual('pending');
      expect(res.body.provider_profile.is_available).toBe(false);

      providerProfileId = res.body.provider_profile.id;
    });
  });

  describe('PATCH /api/v1/providers/:id/availability (Module 2 DoD Gate)', () => {
    it('BLOCKS unapproved provider from becoming available with 400 KYC_NOT_APPROVED (Test Case 4)', async () => {
      const res = await request(app)
        .patch(`/api/v1/providers/${providerProfileId}/availability`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ is_available: true });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('KYC_NOT_APPROVED');
    });

    it('allows provider to set is_available = false even when unapproved', async () => {
      const res = await request(app)
        .patch(`/api/v1/providers/${providerProfileId}/availability`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ is_available: false });

      expect(res.statusCode).toEqual(200);
      expect(res.body.provider_profile.is_available).toBe(false);
    });

    it('allows approved provider to be marked is_available = true', async () => {
      // Simulate admin approving provider in DB
      memDb.public.none(`UPDATE provider_profiles SET kyc_status = 'approved' WHERE id = '${providerProfileId}'`);

      const res = await request(app)
        .patch(`/api/v1/providers/${providerProfileId}/availability`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ is_available: true });

      expect(res.statusCode).toEqual(200);
      expect(res.body.provider_profile.is_available).toBe(true);
    });
  });

  describe('PATCH /api/v1/providers/:id/service-area', () => {
    it('rejects invalid category not in PRD scope with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/providers/${providerProfileId}/service-area`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          categories: ['carpentry'], // Not in MVP
          radius_km: 10,
          lat: 18.520430,
          lng: 73.856744
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('VALIDATION_ERROR');
    });

    it('updates categories and service area radius for valid inputs', async () => {
      const res = await request(app)
        .patch(`/api/v1/providers/${providerProfileId}/service-area`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          categories: ['plumbing', 'electrical'],
          radius_km: 20,
          lat: 18.520430,
          lng: 73.856744
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.provider_profile.categories).toEqual(['plumbing', 'electrical']);
      expect(res.body.provider_profile.service_area_radius_km).toEqual(20);
      expect(parseFloat(res.body.provider_profile.base_location_lat)).toBeCloseTo(18.520430);
      expect(parseFloat(res.body.provider_profile.base_location_lng)).toBeCloseTo(73.856744);
    });
  });

  describe('GET /api/v1/providers/:id', () => {
    it('returns provider profile with ratings and joined user info', async () => {
      const res = await request(app)
        .get(`/api/v1/providers/${providerProfileId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('provider_profile');
      expect(res.body.provider_profile.id).toEqual(providerProfileId);
      expect(res.body.provider_profile.user_name).toEqual('Ramesh Plumber');
      expect(res.body.provider_profile.kyc_status).toEqual('approved');
      expect(res.body.provider_profile.is_available).toBe(true);
    });

    it('returns 404 NOT_FOUND for unknown provider ID', async () => {
      const res = await request(app)
        .get('/api/v1/providers/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.error.code).toEqual('NOT_FOUND');
    });
  });
});
