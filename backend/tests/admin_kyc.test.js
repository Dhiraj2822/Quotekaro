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

describe('Module 2 - Task 4: Admin KYC Approval Queue Endpoints', () => {
  let memDb;
  let adminToken;
  let providerToken;
  let customerToken;
  let pendingProviderId;
  let pendingProfileId;
  let approvedProfileId;

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

    // Seed test users
    const adminUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900040', 'admin', 'Ops Admin', 'Pune')
      RETURNING id;
    `)[0];
    adminToken = makeToken({ id: adminUser.id, phone_number: '+919999900040', role: 'admin' });

    const customerUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900041', 'customer', 'Test Customer', 'Pune')
      RETURNING id;
    `)[0];
    customerToken = makeToken({ id: customerUser.id, phone_number: '+919999900041', role: 'customer' });

    const providerUser1 = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900042', 'provider', 'Suresh Electrician', 'Pune')
      RETURNING id;
    `)[0];
    pendingProviderId = providerUser1.id;
    providerToken = makeToken({ id: providerUser1.id, phone_number: '+919999900042', role: 'provider' });

    const providerUser2 = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900043', 'provider', 'Mahesh Painter', 'Pune')
      RETURNING id;
    `)[0];

    // Seed provider profiles
    const profile1 = memDb.public.many(`
      INSERT INTO provider_profiles (user_id, kyc_status, kyc_document_url, categories, service_area_radius_km)
      VALUES ('${pendingProviderId}', 'pending', 'https://storage.quotekaro.com/kyc/suresh_doc.pdf', ARRAY['electrical'], 10)
      RETURNING id;
    `)[0];
    pendingProfileId = profile1.id;

    const profile2 = memDb.public.many(`
      INSERT INTO provider_profiles (user_id, kyc_status, kyc_document_url, categories, service_area_radius_km, is_available)
      VALUES ('${providerUser2.id}', 'approved', 'https://storage.quotekaro.com/kyc/mahesh_doc.pdf', ARRAY['painting'], 15, true)
      RETURNING id;
    `)[0];
    approvedProfileId = profile2.id;
  });

  describe('Authorization & RBAC checks (Test Case 8)', () => {
    it('blocks unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app).get('/api/v1/admin/providers');
      expect(res.statusCode).toEqual(401);
      expect(res.body.error.code).toEqual('UNAUTHORIZED');
    });

    it('blocks customer role from accessing admin KYC queue with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/providers')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('blocks provider role from accessing admin KYC queue with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/providers')
        .set('Authorization', `Bearer ${providerToken}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });
  });

  describe('GET /api/v1/admin/providers', () => {
    it('returns all providers when no filter is provided', async () => {
      const res = await request(app)
        .get('/api/v1/admin/providers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('providers');
      expect(res.body.providers.length).toBeGreaterThanOrEqual(2);
    });

    it('filters providers by kyc_status=pending', async () => {
      const res = await request(app)
        .get('/api/v1/admin/providers?kyc_status=pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.providers).toHaveLength(1);
      expect(res.body.providers[0].user_name).toEqual('Suresh Electrician');
      expect(res.body.providers[0].kyc_status).toEqual('pending');
      expect(res.body.providers[0].kyc_document_url).toEqual('https://storage.quotekaro.com/kyc/suresh_doc.pdf');
    });

    it('filters providers by kyc_status=approved', async () => {
      const res = await request(app)
        .get('/api/v1/admin/providers?kyc_status=approved')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.providers).toHaveLength(1);
      expect(res.body.providers[0].user_name).toEqual('Mahesh Painter');
      expect(res.body.providers[0].kyc_status).toEqual('approved');
    });

    it('rejects invalid kyc_status query param with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .get('/api/v1/admin/providers?kyc_status=unknown_status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/admin/providers/:id/kyc', () => {
    it('rejects invalid kyc_status with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/providers/${pendingProfileId}/kyc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ kyc_status: 'invalid' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('VALIDATION_ERROR');
    });

    it('returns 404 NOT_FOUND for non-existent provider profile', async () => {
      const res = await request(app)
        .patch('/api/v1/admin/providers/00000000-0000-0000-0000-000000000000/kyc')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ kyc_status: 'approved' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error.code).toEqual('NOT_FOUND');
    });

    it('approves a pending provider profile and verifies availability can now be activated', async () => {
      // Step 1: Admin approves KYC
      const res = await request(app)
        .patch(`/api/v1/admin/providers/${pendingProfileId}/kyc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ kyc_status: 'approved' });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('provider_profile');
      expect(res.body.provider_profile.kyc_status).toEqual('approved');
      expect(res.body.provider_profile.user_name).toEqual('Suresh Electrician');

      // Step 2: Verification of Module 2 DoD Gate / Test Case 4:
      // Now the provider can set is_available = true
      const availRes = await request(app)
        .patch(`/api/v1/providers/${pendingProfileId}/availability`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ is_available: true });

      expect(availRes.statusCode).toEqual(200);
      expect(availRes.body.provider_profile.is_available).toBe(true);
    });

    it('rejects a provider profile and ensures availability is disabled', async () => {
      // Admin rejects the profile
      const res = await request(app)
        .patch(`/api/v1/admin/providers/${pendingProfileId}/kyc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          kyc_status: 'rejected',
          rejection_reason: 'Photo ID unclear'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.provider_profile.kyc_status).toEqual('rejected');
      expect(res.body.provider_profile.is_available).toBe(false);
      expect(res.body.provider_profile.rejection_reason).toEqual('Photo ID unclear');

      // Now attempting to toggle availability to true must fail with KYC_NOT_APPROVED
      const blockedRes = await request(app)
        .patch(`/api/v1/providers/${pendingProfileId}/availability`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ is_available: true });

      expect(blockedRes.statusCode).toEqual(400);
      expect(blockedRes.body.error.code).toEqual('KYC_NOT_APPROVED');
    });
  });
});
