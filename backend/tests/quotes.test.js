const request = require('supertest');
const jwt = require('jsonwebtoken');
const { newDb } = require('pg-mem');
const crypto = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');
const { calculateBlendedScores } = require('../src/quotes/quotes.service');

const JWT_SECRET = process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Module 4 - Task 2: Quotes & Booking Endpoints', () => {
  let memDb;

  // Customers
  let customerAId;
  let customerAToken;
  let customerBId;
  let customerBToken;

  // Providers
  let approvedProv1UserId;
  let approvedProv1ProfileId;
  let approvedProv1Token;

  let approvedProv2UserId;
  let approvedProv2ProfileId;
  let approvedProv2Token;

  let unapprovedProvUserId;
  let unapprovedProvToken;

  let testJobId;
  let quote1Id;
  let quote2Id;

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
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_quotes_job_provider UNIQUE (job_id, provider_id)
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE UNIQUE,
        quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
        status booking_status_enum NOT NULL DEFAULT 'confirmed',
        scheduled_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        before_photo_url TEXT,
        after_photo_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Helper to run query with parameter replacement
    function executeSql(text, params) {
      const trimmed = text.trim().toUpperCase();
      if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }

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
          } else if (typeof param === 'number' || typeof param === 'boolean') {
            val = param;
          } else {
            val = `'${param}'`;
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
    }

    jest.spyOn(db, 'query').mockImplementation(async (text, params) => executeSql(text, params));
    jest.spyOn(db, 'getClient').mockImplementation(async () => ({
      query: async (text, params) => executeSql(text, params),
      release: () => {}
    }));

    // Seed test users & profiles
    // 1. Customer A
    const custA = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900071', 'customer', 'Anjali Customer', 'Pune')
      RETURNING id;
    `)[0];
    customerAId = custA.id;
    customerAToken = makeToken({ id: customerAId, phone_number: '+919999900071', role: 'customer' });

    // 2. Customer B
    const custB = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900072', 'customer', 'Vikram Other', 'Pune')
      RETURNING id;
    `)[0];
    customerBId = custB.id;
    customerBToken = makeToken({ id: customerBId, phone_number: '+919999900072', role: 'customer' });

    // 3. Provider 1: Cheaper (₹400), but LOWER rating (2.5 stars)
    const prov1User = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900073', 'provider', 'Cheap Low-Rated Provider', 'Pune')
      RETURNING id;
    `)[0];
    approvedProv1UserId = prov1User.id;
    approvedProv1Token = makeToken({ id: approvedProv1UserId, phone_number: '+919999900073', role: 'provider' });

    const prov1Profile = memDb.public.many(`
      INSERT INTO provider_profiles (
        user_id, kyc_status, categories, is_available,
        avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
      )
      VALUES ('${approvedProv1UserId}', 'approved', ARRAY['plumbing'], true, 2.5, 2.5, 2.5)
      RETURNING id;
    `)[0];
    approvedProv1ProfileId = prov1Profile.id;

    // 4. Provider 2: Slightly higher price (₹480), but HIGHEST rating (4.9 stars)
    const prov2User = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900074', 'provider', 'Premium High-Rated Provider', 'Pune')
      RETURNING id;
    `)[0];
    approvedProv2UserId = prov2User.id;
    approvedProv2Token = makeToken({ id: approvedProv2UserId, phone_number: '+919999900074', role: 'provider' });

    const prov2Profile = memDb.public.many(`
      INSERT INTO provider_profiles (
        user_id, kyc_status, categories, is_available,
        avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
      )
      VALUES ('${approvedProv2UserId}', 'approved', ARRAY['plumbing'], true, 4.9, 5.0, 4.8)
      RETURNING id;
    `)[0];
    approvedProv2ProfileId = prov2Profile.id;

    // 5. Provider 3: Unapproved KYC
    const prov3User = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900075', 'provider', 'Pending KYC Provider', 'Pune')
      RETURNING id;
    `)[0];
    unapprovedProvUserId = prov3User.id;
    unapprovedProvToken = makeToken({ id: unapprovedProvUserId, phone_number: '+919999900075', role: 'provider' });

    memDb.public.none(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories, is_available)
      VALUES ('${unapprovedProvUserId}', 'pending', ARRAY['plumbing'], false);
    `);

    // 6. Test Job posted by Customer A
    const job = memDb.public.many(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
      VALUES ('${customerAId}', 'plumbing', 'planned', 'Leaking bathroom mixer tap', 'Aundh, Pune', 18.5580, 73.8075, 'open')
      RETURNING id;
    `)[0];
    testJobId = job.id;
  });

  describe('Blended Score Algorithm (Unit)', () => {
    it('ranks higher-rated provider ahead of cheaper low-rated provider in blended score', () => {
      const mockQuotes = [
        {
          id: 'q1',
          price_paise: 40000, // ₹400 (cheapest)
          avg_rating_honesty: 2.5,
          avg_rating_punctuality: 2.5,
          avg_rating_quality: 2.5
        },
        {
          id: 'q2',
          price_paise: 48000, // ₹480 (20% higher price)
          avg_rating_honesty: 4.9,
          avg_rating_punctuality: 5.0,
          avg_rating_quality: 4.8
        }
      ];

      const scored = calculateBlendedScores(mockQuotes);
      const q1 = scored.find((q) => q.id === 'q1');
      const q2 = scored.find((q) => q.id === 'q2');

      // Provider 2 has a significantly higher blended score than Provider 1
      expect(q2.blended_score).toBeGreaterThan(q1.blended_score);
    });
  });

  describe('POST /api/v1/jobs/:id/quotes', () => {
    it('blocks unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .send({ price_paise: 45000, eta_minutes: 30 });

      expect(res.statusCode).toEqual(401);
      expect(res.body.error.code).toEqual('UNAUTHORIZED');
    });

    it('blocks customer role from submitting quotes with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ price_paise: 45000, eta_minutes: 30 });

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('Scenario D: Unverified provider is rejected with 403 KYC_NOT_APPROVED', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${unapprovedProvToken}`)
        .send({ price_paise: 45000, eta_minutes: 30 });

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('KYC_NOT_APPROVED');
      expect(res.body.error.message).toMatch(/Only KYC-approved providers/i);
    });

    it('rejects quote without price_paise with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${approvedProv1Token}`)
        .send({ eta_minutes: 30 });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/price_paise is required/i);
    });

    it('successfully submits quote from Provider 1 (₹400, low rating) and updates job to quoted', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${approvedProv1Token}`)
        .send({
          price_paise: 40000,
          eta_minutes: 25,
          message: 'Can fix with standard washer kit'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('quote');
      expect(res.body.quote.price_paise).toEqual(40000);
      expect(res.body.quote.status).toEqual('pending');
      quote1Id = res.body.quote.id;
    });

    it('Test Case 3: Rejects duplicate quote from the same provider with 409 DUPLICATE_QUOTE', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${approvedProv1Token}`)
        .send({
          price_paise: 38000,
          eta_minutes: 20
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.error.code).toEqual('DUPLICATE_QUOTE');
      expect(res.body.error.message).toMatch(/already submitted a quote/i);
    });

    it('successfully submits quote from Provider 2 (₹480, 4.9 rating)', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${approvedProv2Token}`)
        .send({
          price_paise: 48000,
          eta_minutes: 40,
          message: 'Includes 6-month leak warranty'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.quote.price_paise).toEqual(48000);
      quote2Id = res.body.quote.id;
    });
  });

  describe('GET /api/v1/jobs/:id/quotes', () => {
    it('Test Case 7: Blocks Customer B from viewing Customer A quotes with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('Test Case 2: Quotes are sorted by blended score by default, NOT price ascending', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('quotes');
      expect(res.body.quotes.length).toEqual(2);

      // Verify Provider 2 (₹480 with 4.9 rating) ranks #1 by default because of higher blended score
      const firstQuote = res.body.quotes[0];
      const secondQuote = res.body.quotes[1];

      expect(firstQuote.provider_id).toEqual(approvedProv2ProfileId);
      expect(firstQuote.price_paise).toEqual(48000);
      expect(firstQuote.provider.overall_rating).toBeCloseTo(4.9, 1);
      expect(firstQuote.blended_score).toBeGreaterThan(secondQuote.blended_score);

      expect(secondQuote.provider_id).toEqual(approvedProv1ProfileId);
      expect(secondQuote.price_paise).toEqual(40000);
    });

    it('allows explicit sort by price with ?sort=price_asc', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${testJobId}/quotes?sort=price_asc`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.quotes[0].provider_id).toEqual(approvedProv1ProfileId);
      expect(res.body.quotes[0].price_paise).toEqual(40000);
      expect(res.body.quotes[1].provider_id).toEqual(approvedProv2ProfileId);
      expect(res.body.quotes[1].price_paise).toEqual(48000);
    });
  });

  describe('POST /api/v1/jobs/:id/accept-quote', () => {
    it('Test Case 7: Blocks Customer B from accepting quote for Customer A job with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/accept-quote`)
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ quote_id: quote2Id });

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('rejects accept-quote with invalid or non-existent quote_id', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/accept-quote`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ quote_id: '00000000-0000-0000-0000-000000000000' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error.code).toEqual('INVALID_QUOTE');
    });

    it('Customer A accepts Provider 2 quote -> booking created, other quote rejected, job booked', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/accept-quote`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ quote_id: quote2Id });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('booking');
      expect(res.body.booking.job_id).toEqual(testJobId);
      expect(res.body.booking.quote_id).toEqual(quote2Id);
      expect(res.body.booking.customer_id).toEqual(customerAId);
      expect(res.body.booking.provider_id).toEqual(approvedProv2ProfileId);
      expect(res.body.booking.status).toEqual('confirmed');

      // Verify accepted quote status is 'accepted'
      const q2Row = memDb.public.many(`SELECT status FROM quotes WHERE id = '${quote2Id}'`)[0];
      expect(q2Row.status).toEqual('accepted');

      // Verify competing quote status is updated to 'rejected'
      const q1Row = memDb.public.many(`SELECT status FROM quotes WHERE id = '${quote1Id}'`)[0];
      expect(q1Row.status).toEqual('rejected');

      // Verify job status is updated to 'booked'
      const jobRow = memDb.public.many(`SELECT status FROM jobs WHERE id = '${testJobId}'`)[0];
      expect(jobRow.status).toEqual('booked');
    });

    it('rejects further quote acceptance once job is already booked', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/accept-quote`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ quote_id: quote1Id });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('JOB_ALREADY_BOOKED');
    });
  });
});
