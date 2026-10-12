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

describe('Module 8 - Task 2: Disputes Management Endpoints', () => {
  let memDb;

  let adminUser, adminToken;
  let customerUser, customerToken;
  let otherCustomerUser, otherCustomerToken;
  let providerUser, providerToken;
  let otherProviderUser, otherProviderToken;
  let providerProfileId;
  let testJobId;
  let testQuoteId;
  let testBookingId;

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
        kyc_status kyc_status_enum NOT NULL DEFAULT 'approved',
        categories TEXT[],
        service_area_radius_km INTEGER DEFAULT 25,
        base_location_lat DECIMAL,
        base_location_lng DECIMAL,
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
        photo_urls TEXT[],
        area VARCHAR(100),
        lat DECIMAL,
        lng DECIMAL,
        status job_status_enum NOT NULL DEFAULT 'open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE quote_status_enum AS ENUM ('pending', 'accepted', 'rejected');
      CREATE TYPE booking_status_enum AS ENUM ('confirmed', 'en_route', 'in_progress', 'completed', 'cancelled');

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

      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) UNIQUE,
        quote_id UUID REFERENCES quotes(id),
        customer_id UUID NOT NULL REFERENCES users(id),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id),
        status booking_status_enum NOT NULL DEFAULT 'confirmed',
        scheduled_at TIMESTAMP,
        completed_at TIMESTAMP,
        before_photo_url TEXT,
        after_photo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE dispute_status_enum AS ENUM ('open', 'under_review', 'resolved');

      CREATE TABLE IF NOT EXISTS disputes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
        raised_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        reason TEXT NOT NULL,
        status dispute_status_enum NOT NULL DEFAULT 'open',
        resolution_notes TEXT,
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

    // Seed test users
    adminUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900080', 'admin', 'Dispute Admin', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    adminToken = makeToken({ id: adminUser.id, phone_number: adminUser.phone_number, role: 'admin' });

    customerUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900081', 'customer', 'Kavita Customer', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    customerToken = makeToken({ id: customerUser.id, phone_number: customerUser.phone_number, role: 'customer' });

    otherCustomerUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900082', 'customer', 'Rohan Outsider', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    otherCustomerToken = makeToken({ id: otherCustomerUser.id, phone_number: otherCustomerUser.phone_number, role: 'customer' });

    providerUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900083', 'provider', 'Ganesh Electrician', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    providerToken = makeToken({ id: providerUser.id, phone_number: providerUser.phone_number, role: 'provider' });

    otherProviderUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900084', 'provider', 'Sanjay Plumber', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    otherProviderToken = makeToken({ id: otherProviderUser.id, phone_number: otherProviderUser.phone_number, role: 'provider' });

    // Seed provider profile
    const pp = memDb.public.many(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories)
      VALUES ('${providerUser.id}', 'approved', ARRAY['electrical'])
      RETURNING id;
    `)[0];
    providerProfileId = pp.id;

    const otherPp = memDb.public.many(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories)
      VALUES ('${otherProviderUser.id}', 'approved', ARRAY['plumbing'])
      RETURNING id;
    `)[0];

    // Seed test job, quote, booking
    const job = memDb.public.many(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, photo_urls)
      VALUES ('${customerUser.id}', 'electrical', 'planned', 'Switchboard sparking and burning smell', 'Kothrud', 18.5074, 73.8077, ARRAY['https://example.com/photo1.jpg'])
      RETURNING id;
    `)[0];
    testJobId = job.id;

    const quote = memDb.public.many(`
      INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES ('${testJobId}', '${providerProfileId}', 120000, 30, 'Can repair switchboard', 'accepted')
      RETURNING id;
    `)[0];
    testQuoteId = quote.id;

    const booking = memDb.public.many(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status, before_photo_url, after_photo_url)
      VALUES ('${testJobId}', '${testQuoteId}', '${customerUser.id}', '${providerProfileId}', 'completed', 'https://example.com/before.jpg', 'https://example.com/after.jpg')
      RETURNING id;
    `)[0];
    testBookingId = booking.id;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. POST /bookings/:id/disputes — Raising a Dispute', () => {
    it('allows the customer who owns the booking to raise a dispute', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/disputes`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'The switchboard was not fixed properly and tripped the main breaker.'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('dispute');
      expect(res.body.dispute.booking_id).toBe(testBookingId);
      expect(res.body.dispute.raised_by).toBe(customerUser.id);
      expect(res.body.dispute.status).toBe('open');
      expect(res.body.dispute.reason).toContain('switchboard was not fixed');
    });

    it('allows the assigned provider to raise a dispute on the booking', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/disputes`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          reason: 'Customer refused to pay agreed additional material charges.'
        });

      expect(res.status).toBe(201);
      expect(res.body.dispute.booking_id).toBe(testBookingId);
      expect(res.body.dispute.raised_by).toBe(providerUser.id);
      expect(res.body.dispute.status).toBe('open');
    });

    it('rejects an unrelated customer with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/disputes`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          reason: 'Intruding into another customer booking dispute.'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects an unrelated provider with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/disputes`)
        .set('Authorization', `Bearer ${otherProviderToken}`)
        .send({
          reason: 'Unassigned provider trying to dispute.'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 NOT_FOUND for a non-existent booking ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/v1/bookings/${fakeId}/disputes`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Dispute for missing booking'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('validates dispute reason (rejects empty or short string with 400)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/disputes`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'bad'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('2. GET /bookings/:id/disputes — Booking Participant Retrieval', () => {
    it('allows the customer to view disputes on their booking', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/disputes`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('disputes');
      expect(Array.isArray(res.body.disputes)).toBe(true);
      expect(res.body.disputes.length).toBeGreaterThanOrEqual(2);
    });

    it('allows the assigned provider to view disputes on their booking', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/disputes`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('disputes');
      expect(res.body.disputes.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects an unrelated customer from viewing disputes with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/disputes`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('3. Admin RBAC Protection (08_TESTING_STRATEGY.md §2 Test Case 8)', () => {
    it('blocks a provider from accessing GET /admin/disputes with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('blocks a customer from accessing GET /admin/disputes with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('blocks a provider from accessing PATCH /admin/disputes/:id with 403 FORBIDDEN', async () => {
      const fakeDisputeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${fakeDisputeId}`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('blocks unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('4. GET /admin/disputes — Admin Dispute Listing & Details', () => {
    let createdDisputeId;

    it('allows admin to list all disputes with populated details', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('disputes');
      expect(Array.isArray(res.body.disputes)).toBe(true);
      expect(res.body.disputes.length).toBeGreaterThanOrEqual(2);

      const d = res.body.disputes[0];
      createdDisputeId = d.id;
      expect(d).toHaveProperty('booking_id');
      expect(d).toHaveProperty('raiser_name');
      expect(d).toHaveProperty('raiser_phone');
      expect(d).toHaveProperty('raiser_role');
      expect(d).toHaveProperty('booking_status');
      expect(d).toHaveProperty('job_description');
      expect(d).toHaveProperty('job_category');
      expect(d).toHaveProperty('customer_name');
      expect(d).toHaveProperty('provider_name');
      expect(d).toHaveProperty('before_photo_url');
      expect(d).toHaveProperty('after_photo_url');
    });

    it('allows admin to filter disputes by status ?status=open', async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes?status=open')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.disputes.every(d => d.status === 'open')).toBe(true);
    });

    it('allows admin to fetch single dispute details by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${createdDisputeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.dispute.id).toBe(createdDisputeId);
      expect(res.body.dispute.status).toBe('open');
    });

    it('returns 404 when admin queries non-existent dispute ID', async () => {
      const fakeDisputeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/admin/disputes/${fakeDisputeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('5. PATCH /admin/disputes/:id — Admin Dispute Resolution', () => {
    let disputeToResolve;

    beforeAll(async () => {
      const res = await request(app)
        .get('/api/v1/admin/disputes?status=open')
        .set('Authorization', `Bearer ${adminToken}`);
      disputeToResolve = res.body.disputes[0];
    });

    it('allows admin to update status to under_review', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeToResolve.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'under_review',
          resolution_notes: 'Support team contacting both customer and provider for statements.'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('dispute');
      expect(res.body.dispute.id).toBe(disputeToResolve.id);
      expect(res.body.dispute.status).toBe('under_review');
      expect(res.body.dispute.resolution_notes).toContain('Support team contacting');
    });

    it('allows admin to resolve dispute with final resolution notes', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeToResolve.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'resolved',
          resolution_notes: 'Provider agreed to return and fix wiring at no extra cost. Dispute resolved.'
        });

      expect(res.status).toBe(200);
      expect(res.body.dispute.status).toBe('resolved');
      expect(res.body.dispute.resolution_notes).toContain('Dispute resolved');
    });

    it('rejects invalid status values with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${disputeToResolve.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'closed_without_fix'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for updating a non-existent dispute', async () => {
      const fakeDisputeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .patch(`/api/v1/admin/disputes/${fakeDisputeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'resolved',
          resolution_notes: 'Testing missing dispute.'
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
