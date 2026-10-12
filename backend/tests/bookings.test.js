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

describe('Module 4 - Task 5: Bookings Endpoints & Retrieval', () => {
  let memDb;

  let customerAId;
  let customerAToken;
  let customerBId;
  let customerBToken;

  let providerUserId;
  let providerProfileId;
  let providerToken;

  let otherProviderUserId;
  let otherProviderProfileId;
  let otherProviderToken;

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

  beforeEach(() => {
    memDb.public.none('DELETE FROM bookings;');
    memDb.public.none('DELETE FROM quotes;');
    memDb.public.none('DELETE FROM jobs;');
    memDb.public.none('DELETE FROM provider_profiles;');
    memDb.public.none('DELETE FROM users;');

    // 1. Customer A
    const uA = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900001', 'customer', 'Ramesh Customer', 'Pune')
      RETURNING id;
    `);
    customerAId = uA.id;
    customerAToken = makeToken({ id: customerAId, phone_number: '+919999900001', role: 'customer' });

    // 2. Customer B
    const uB = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900002', 'customer', 'Suresh Customer', 'Pune')
      RETURNING id;
    `);
    customerBId = uB.id;
    customerBToken = makeToken({ id: customerBId, phone_number: '+919999900002', role: 'customer' });

    // 3. Provider 1
    const pU1 = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900003', 'provider', 'Mahesh Plumber', 'Pune')
      RETURNING id;
    `);
    providerUserId = pU1.id;
    providerToken = makeToken({ id: providerUserId, phone_number: '+919999900003', role: 'provider' });

    const pP1 = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories, is_available, avg_rating_honesty, avg_rating_punctuality, avg_rating_quality)
      VALUES ('${providerUserId}', 'approved', ARRAY['plumbing']::text[], true, 4.8, 4.9, 4.7)
      RETURNING id;
    `);
    providerProfileId = pP1.id;

    // 4. Other Provider 2
    const pU2 = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900004', 'provider', 'Ganesh Electrician', 'Pune')
      RETURNING id;
    `);
    otherProviderUserId = pU2.id;
    otherProviderToken = makeToken({ id: otherProviderUserId, phone_number: '+919999900004', role: 'provider' });

    const pP2 = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories, is_available, avg_rating_honesty, avg_rating_punctuality, avg_rating_quality)
      VALUES ('${otherProviderUserId}', 'approved', ARRAY['electrical']::text[], true, 4.5, 4.5, 4.5)
      RETURNING id;
    `);
    otherProviderProfileId = pP2.id;

    // 5. Create Job for Customer A
    const job = memDb.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
      VALUES ('${customerAId}', 'plumbing', 'planned', 'Kitchen pipe leak repair', 'Kothrud, Pune', 18.5074, 73.8077, 'booked')
      RETURNING id;
    `);
    testJobId = job.id;

    // 6. Create Quote from Provider 1
    const quote = memDb.public.one(`
      INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES ('${testJobId}', '${providerProfileId}', 45000, 30, 'Can arrive in 30 mins with tools', 'accepted')
      RETURNING id;
    `);
    testQuoteId = quote.id;

    // 7. Create Confirmed Booking
    const booking = memDb.public.one(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
      VALUES ('${testJobId}', '${testQuoteId}', '${customerAId}', '${providerProfileId}', 'confirmed')
      RETURNING id;
    `);
    testBookingId = booking.id;
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/bookings/:id', () => {
    it('returns 200 with populated details for the owning customer', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('booking');
      const b = res.body.booking;
      expect(b.id).toBe(testBookingId);
      expect(b.status).toBe('confirmed');
      expect(b.price_paise).toBe(45000);
      expect(b.job.category).toBe('plumbing');
      expect(b.job.description).toBe('Kitchen pipe leak repair');
      expect(b.job.area).toBe('Kothrud, Pune');
      expect(b.provider.name).toBe('Mahesh Plumber');
      expect(b.provider.phone_number).toBe('+919999900003');
      expect(b.customer.name).toBe('Ramesh Customer');
    });

    it('returns 200 for the assigned provider', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.booking.id).toBe(testBookingId);
      expect(res.body.booking.customer.name).toBe('Ramesh Customer');
    });

    it('returns 403 FORBIDDEN when another customer attempts to view the booking (Test Case 7)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 FORBIDDEN when an unassigned provider attempts to view the booking', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}`)
        .set('Authorization', `Bearer ${otherProviderToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 NOT_FOUND for nonexistent booking id', async () => {
      const randomId = crypto.randomUUID();
      const res = await request(app)
        .get(`/api/v1/bookings/${randomId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 401 UNAUTHORIZED when no token is supplied', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/bookings', () => {
    it('returns list of bookings for authenticated customer', async () => {
      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('bookings');
      expect(Array.isArray(res.body.bookings)).toBe(true);
      expect(res.body.bookings.length).toBe(1);
      expect(res.body.bookings[0].id).toBe(testBookingId);
    });

    it('returns empty list for customer with no bookings', async () => {
      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.bookings.length).toBe(0);
    });

    it('returns assigned bookings for provider', async () => {
      const res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.bookings.length).toBe(1);
      expect(res.body.bookings[0].id).toBe(testBookingId);
    });
  });

  describe('PATCH /api/v1/bookings/:id/status (Module 5 Task 1)', () => {
    it('assigned provider updates status to en_route', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'en_route', lat: 18.5100, lng: 73.8100 });

      expect(res.statusCode).toBe(200);
      expect(res.body.booking.status).toBe('en_route');
    });

    it('assigned provider updates status to in_progress and synchronizes job status', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'in_progress' });

      expect(res.statusCode).toBe(200);
      expect(res.body.booking.status).toBe('in_progress');
      expect(res.body.booking.job.status).toBe('in_progress');
    });

    it('customer cannot update status to en_route (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ status: 'en_route' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('unassigned provider cannot update status (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${otherProviderToken}`)
        .send({ status: 'en_route' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 400 for invalid status value', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${testBookingId}/status`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ status: 'invalid_status' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/bookings/:id/track (Module 5 Task 1)', () => {
    it('returns provider live location & estimated ETA for customer', async () => {
      // First, provider pings location
      await request(app)
        .post(`/api/v1/bookings/${testBookingId}/location`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ lat: 18.5100, lng: 73.8100 });

      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/track`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('provider_lat', 18.51);
      expect(res.body).toHaveProperty('provider_lng', 73.81);
      expect(res.body).toHaveProperty('eta_minutes');
      expect(res.body).toHaveProperty('destination_lat', 18.5074);
      expect(res.body).toHaveProperty('destination_lng', 73.8077);
      expect(typeof res.body.eta_minutes).toBe('number');
    });

    it('assigned provider can also view tracking details', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/track`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('provider_lat');
      expect(res.body).toHaveProperty('eta_minutes');
    });

    it('unauthorized customer cannot track this booking (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/track`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
