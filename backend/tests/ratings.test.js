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

describe('Module 7 - Task 2: POST /bookings/:id/rating & Multi-Axis Ratings (Test Case 10)', () => {
  let memDb;

  let customerAId;
  let customerAToken;

  let customerBId;
  let customerBToken;

  let providerUserId;
  let providerProfileId;
  let providerToken;

  let testJob1Id;
  let testQuote1Id;
  let completedBooking1Id;

  let testJob2Id;
  let testQuote2Id;
  let completedBooking2Id;

  let inProgressBookingId;

  beforeAll(() => {
    memDb = newDb();
    memDb.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      returns: memDb.public.getType('uuid'),
      implementation: () => crypto.randomUUID()
    });

    memDb.public.registerFunction({
      name: 'round',
      args: [memDb.public.getType('numeric'), memDb.public.getType('integer')],
      returns: memDb.public.getType('numeric'),
      implementation: (val, decimals) => {
        const factor = Math.pow(10, decimals);
        return Math.round(val * factor) / factor;
      }
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

      CREATE TABLE IF NOT EXISTS ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
        rating_honesty SMALLINT NOT NULL CHECK (rating_honesty BETWEEN 1 AND 5),
        rating_punctuality SMALLINT NOT NULL CHECK (rating_punctuality BETWEEN 1 AND 5),
        rating_quality SMALLINT NOT NULL CHECK (rating_quality BETWEEN 1 AND 5),
        review_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    function executeSql(text, params) {
      const trimmed = text.trim();
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

    jest.spyOn(db, 'getClient').mockImplementation(() => {
      return Promise.resolve({
        query: (text, params) => Promise.resolve(executeSql(text, params)),
        release: () => {}
      });
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    memDb.public.none('DELETE FROM ratings;');
    memDb.public.none('DELETE FROM bookings;');
    memDb.public.none('DELETE FROM quotes;');
    memDb.public.none('DELETE FROM jobs;');
    memDb.public.none('DELETE FROM provider_profiles;');
    memDb.public.none('DELETE FROM users;');

    // Customer A
    const uA = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900051', 'customer', 'Customer Alice', 'Pune')
      RETURNING id;
    `);
    customerAId = uA.id;
    customerAToken = makeToken({ id: customerAId, role: 'customer', phone_number: '+919999900051' });

    // Customer B
    const uB = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900052', 'customer', 'Customer Bob', 'Pune')
      RETURNING id;
    `);
    customerBId = uB.id;
    customerBToken = makeToken({ id: customerBId, role: 'customer', phone_number: '+919999900052' });

    // Provider
    const pU = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900053', 'provider', 'Mahesh Electrician', 'Pune')
      RETURNING id;
    `);
    providerUserId = pU.id;
    providerToken = makeToken({ id: providerUserId, role: 'provider', phone_number: '+919999900053' });

    const pP = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, categories, wallet_balance_paise)
      VALUES ('${providerUserId}', ARRAY['electrical'], 50000)
      RETURNING id;
    `);
    providerProfileId = pP.id;

    // Completed Job 1 for Customer A
    const j1 = memDb.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, status)
      VALUES ('${customerAId}', 'electrical', 'planned', 'Switchboard spark repair', 'completed')
      RETURNING id;
    `);
    testJob1Id = j1.id;

    const q1 = memDb.public.one(`
      INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, status)
      VALUES ('${testJob1Id}', '${providerProfileId}', 40000, 20, 'accepted')
      RETURNING id;
    `);
    testQuote1Id = q1.id;

    const b1 = memDb.public.one(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status, completed_at)
      VALUES ('${testJob1Id}', '${testQuote1Id}', '${customerAId}', '${providerProfileId}', 'completed', NOW())
      RETURNING id;
    `);
    completedBooking1Id = b1.id;

    // Completed Job 2 for Customer B
    const j2 = memDb.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, status)
      VALUES ('${customerBId}', 'electrical', 'planned', 'Ceiling fan regulator replacement', 'completed')
      RETURNING id;
    `);
    testJob2Id = j2.id;

    const q2 = memDb.public.one(`
      INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, status)
      VALUES ('${testJob2Id}', '${providerProfileId}', 30000, 30, 'accepted')
      RETURNING id;
    `);
    testQuote2Id = q2.id;

    const b2 = memDb.public.one(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status, completed_at)
      VALUES ('${testJob2Id}', '${testQuote2Id}', '${customerBId}', '${providerProfileId}', 'completed', NOW())
      RETURNING id;
    `);
    completedBooking2Id = b2.id;

    // In-progress Job for Customer A
    const j3 = memDb.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, status)
      VALUES ('${customerAId}', 'electrical', 'planned', 'Pending wire check', 'in_progress')
      RETURNING id;
    `);
    const q3 = memDb.public.one(`
      INSERT INTO quotes (job_id, provider_id, price_paise, status)
      VALUES ('${j3.id}', '${providerProfileId}', 25000, 'accepted')
      RETURNING id;
    `);
    const b3 = memDb.public.one(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
      VALUES ('${j3.id}', '${q3.id}', '${customerAId}', '${providerProfileId}', 'in_progress')
      RETURNING id;
    `);
    inProgressBookingId = b3.id;
  });

  describe('POST /api/v1/bookings/:id/rating', () => {
    it('successfully submits 3-axis rating on completed booking and updates provider averages (Test Case 10)', async () => {
      const payload = {
        rating_honesty: 5,
        rating_punctuality: 4,
        rating_quality: 5,
        review_text: 'Arrived promptly and fixed the wiring cleanly!'
      };

      const res = await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.rating).toBeDefined();
      expect(res.body.rating.booking_id).toBe(completedBooking1Id);
      expect(res.body.rating.rating_honesty).toBe(5);
      expect(res.body.rating.rating_punctuality).toBe(4);
      expect(res.body.rating.rating_quality).toBe(5);
      expect(res.body.rating.review_text).toBe(payload.review_text);

      // Verify provider averages returned in response
      expect(res.body.provider_averages).toBeDefined();
      expect(res.body.provider_averages.avg_rating_honesty).toBe(5.0);
      expect(res.body.provider_averages.avg_rating_punctuality).toBe(4.0);
      expect(res.body.provider_averages.avg_rating_quality).toBe(5.0);
      expect(res.body.provider_averages.total_ratings).toBe(1);

      // Verify denormalized averages in provider_profiles table
      const profile = memDb.public.one(`
        SELECT avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
        FROM provider_profiles
        WHERE id = '${providerProfileId}';
      `);

      expect(parseFloat(profile.avg_rating_honesty)).toBe(5.0);
      expect(parseFloat(profile.avg_rating_punctuality)).toBe(4.0);
      expect(parseFloat(profile.avg_rating_quality)).toBe(5.0);
    });

    it('accurately aggregates denormalized averages across multiple completed bookings (Test Case 10)', async () => {
      // 1. First rating from Customer A (5, 4, 5)
      await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating_honesty: 5,
          rating_punctuality: 4,
          rating_quality: 5
        });

      // 2. Second rating from Customer B (3, 4, 3)
      const res2 = await request(app)
        .post(`/api/v1/bookings/${completedBooking2Id}/rating`)
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({
          rating_honesty: 3,
          rating_punctuality: 4,
          rating_quality: 3,
          review_text: 'Fair price but quality was standard'
        });

      expect(res2.status).toBe(201);
      // Expected:
      // Honesty: (5 + 3) / 2 = 4.0
      // Punctuality: (4 + 4) / 2 = 4.0
      // Quality: (5 + 3) / 2 = 4.0
      expect(res2.body.provider_averages.avg_rating_honesty).toBe(4.0);
      expect(res2.body.provider_averages.avg_rating_punctuality).toBe(4.0);
      expect(res2.body.provider_averages.avg_rating_quality).toBe(4.0);
      expect(res2.body.provider_averages.total_ratings).toBe(2);

      // Verify denormalized provider_profiles in DB
      const profile = memDb.public.one(`
        SELECT avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
        FROM provider_profiles
        WHERE id = '${providerProfileId}';
      `);

      expect(parseFloat(profile.avg_rating_honesty)).toBe(4.0);
      expect(parseFloat(profile.avg_rating_punctuality)).toBe(4.0);
      expect(parseFloat(profile.avg_rating_quality)).toBe(4.0);
    });

    it('rejects rating if booking has not reached completed status (400 BOOKING_NOT_COMPLETED)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${inProgressBookingId}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating_honesty: 5,
          rating_punctuality: 5,
          rating_quality: 5
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BOOKING_NOT_COMPLETED');
    });

    it('rejects rating from unauthorized user (Customer B attempting to rate Customer A booking) (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({
          rating_honesty: 5,
          rating_punctuality: 5,
          rating_quality: 5
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects rating from provider (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          rating_honesty: 5,
          rating_punctuality: 5,
          rating_quality: 5
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects duplicate rating on the same booking (409 CONFLICT)', async () => {
      // 1. First rating succeeds
      await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating_honesty: 5,
          rating_punctuality: 5,
          rating_quality: 5
        });

      // 2. Second rating on same booking is rejected
      const res = await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating_honesty: 4,
          rating_punctuality: 4,
          rating_quality: 4
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_RATED');
    });

    it('validates 3-axis scores (rejects values outside 1-5 and non-integers)', async () => {
      const resTooHigh = await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating_honesty: 6,
          rating_punctuality: 5,
          rating_quality: 5
        });
      expect(resTooHigh.status).toBe(400);

      const resTooLow = await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating_honesty: 0,
          rating_punctuality: 5,
          rating_quality: 5
        });
      expect(resTooLow.status).toBe(400);

      const resDecimal = await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating_honesty: 4.5,
          rating_punctuality: 5,
          rating_quality: 5
        });
      expect(resDecimal.status).toBe(400);
    });
  });

  describe('GET /api/v1/bookings/:id/rating', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating_honesty: 5,
          rating_punctuality: 4,
          rating_quality: 5,
          review_text: 'Superb work!'
        });
    });

    it('allows customer to retrieve their submitted rating', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.rating.rating_honesty).toBe(5);
      expect(res.body.rating.rating_punctuality).toBe(4);
      expect(res.body.rating.rating_quality).toBe(5);
      expect(res.body.rating.review_text).toBe('Superb work!');
    });

    it('allows assigned provider to retrieve the booking rating', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.rating.rating_honesty).toBe(5);
    });

    it('blocks other customers from viewing the rating (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/providers/:id/ratings', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/v1/bookings/${completedBooking1Id}/rating`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          rating_honesty: 5,
          rating_punctuality: 4,
          rating_quality: 5,
          review_text: 'Great work by Mahesh'
        });
    });

    it('returns provider ratings summary and reviews list', async () => {
      const res = await request(app)
        .get(`/api/v1/providers/${providerProfileId}/ratings`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.provider_id).toBe(providerProfileId);
      expect(res.body.averages.avg_rating_honesty).toBe(5.0);
      expect(res.body.averages.avg_rating_punctuality).toBe(4.0);
      expect(res.body.averages.avg_rating_quality).toBe(5.0);
      expect(res.body.reviews.length).toBe(1);
      expect(res.body.reviews[0].customer_name).toBe('Customer Alice');
      expect(res.body.reviews[0].review_text).toBe('Great work by Mahesh');
    });
  });
});
