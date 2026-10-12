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

describe('Module 5 - Task 3: In-App Chat Messages', () => {
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

      CREATE TABLE IF NOT EXISTS booking_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    memDb.public.none('DELETE FROM booking_messages;');
    memDb.public.none('DELETE FROM bookings;');
    memDb.public.none('DELETE FROM quotes;');
    memDb.public.none('DELETE FROM jobs;');
    memDb.public.none('DELETE FROM provider_profiles;');
    memDb.public.none('DELETE FROM users;');

    // Customer A
    const uA = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900001', 'customer', 'Ramesh Customer', 'Pune')
      RETURNING id;
    `);
    customerAId = uA.id;
    customerAToken = makeToken({ id: customerAId, phone_number: '+919999900001', role: 'customer', name: 'Ramesh Customer' });

    // Customer B (unauthorized)
    const uB = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900002', 'customer', 'Suresh Customer', 'Pune')
      RETURNING id;
    `);
    customerBId = uB.id;
    customerBToken = makeToken({ id: customerBId, phone_number: '+919999900002', role: 'customer', name: 'Suresh Customer' });

    // Provider 1 (assigned)
    const pU1 = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900003', 'provider', 'Mahesh Plumber', 'Pune')
      RETURNING id;
    `);
    providerUserId = pU1.id;
    providerToken = makeToken({ id: providerUserId, phone_number: '+919999900003', role: 'provider', name: 'Mahesh Plumber' });

    const pP1 = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories, is_available)
      VALUES ('${providerUserId}', 'approved', ARRAY['plumbing']::text[], true)
      RETURNING id;
    `);
    providerProfileId = pP1.id;

    // Provider 2 (unassigned)
    const pU2 = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900004', 'provider', 'Ganesh Electrician', 'Pune')
      RETURNING id;
    `);
    otherProviderUserId = pU2.id;
    otherProviderToken = makeToken({ id: otherProviderUserId, phone_number: '+919999900004', role: 'provider', name: 'Ganesh Electrician' });

    const pP2 = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories, is_available)
      VALUES ('${otherProviderUserId}', 'approved', ARRAY['electrical']::text[], true)
      RETURNING id;
    `);
    otherProviderProfileId = pP2.id;

    // Job
    const job = memDb.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
      VALUES ('${customerAId}', 'plumbing', 'planned', 'Bathroom pipe repair', 'Kothrud, Pune', 18.5074, 73.8077, 'booked')
      RETURNING id;
    `);
    testJobId = job.id;

    // Quote
    const quote = memDb.public.one(`
      INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES ('${testJobId}', '${providerProfileId}', 45000, 30, 'Ready with tools', 'accepted')
      RETURNING id;
    `);
    testQuoteId = quote.id;

    // Booking
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

  describe('POST /api/v1/bookings/:id/messages', () => {
    it('customer sends a chat message (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ message: 'Hi Mahesh, please ring the second bell on the right.' });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message');
      const msg = res.body.message;
      expect(msg.booking_id).toBe(testBookingId);
      expect(msg.sender_id).toBe(customerAId);
      expect(msg.sender_role).toBe('customer');
      expect(msg.message).toBe('Hi Mahesh, please ring the second bell on the right.');
      expect(msg.is_read).toBe(false);
    });

    it('assigned provider sends a reply message (201 Created)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ message: 'Sure, I am on my way and will reach in 15 mins.' });

      expect(res.statusCode).toBe(201);
      expect(res.body.message.sender_id).toBe(providerUserId);
      expect(res.body.message.sender_role).toBe('provider');
    });

    it('unauthorized customer cannot send message (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${customerBToken}`)
        .send({ message: 'Can I intrude on this booking?' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('unassigned provider cannot send message (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${otherProviderToken}`)
        .send({ message: 'I am not assigned to this job' });

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects empty message with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ message: '   ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/bookings/:id/messages', () => {
    beforeEach(async () => {
      // Customer message 1
      await request(app)
        .post(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({ message: 'Hello provider!' });

      // Provider message 2
      await request(app)
        .post(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${providerToken}`)
        .send({ message: 'Hello customer, en route now.' });
    });

    it('customer retrieves all messages in chronological order (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('messages');
      expect(res.body.messages.length).toBe(2);
      expect(res.body.messages[0].message).toBe('Hello provider!');
      expect(res.body.messages[0].sender_name).toBe('Ramesh Customer');
      expect(res.body.messages[1].message).toBe('Hello customer, en route now.');
      expect(res.body.messages[1].sender_name).toBe('Mahesh Plumber');
    });

    it('provider retrieves all messages (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.messages.length).toBe(2);
    });

    it('unauthorized user cannot read messages (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/messages`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 for nonexistent booking', async () => {
      const fakeId = crypto.randomUUID();
      const res = await request(app)
        .get(`/api/v1/bookings/${fakeId}/messages`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
