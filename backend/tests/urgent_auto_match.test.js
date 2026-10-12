const request = require('supertest');
const jwt = require('jsonwebtoken');
const { newDb } = require('pg-mem');
const crypto = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');
const { autoMatchUrgentJob, PLATFORM_RATES_PAISE } = require('../src/quotes/quotes.service');

const JWT_SECRET = process.env.JWT_SECRET || 'quotekaro_dev_jwt_secret_key_at_least_32_chars_long';

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

describe('Module 4 - Task 3: Urgent Job Auto-Match Logic', () => {
  let memDb;

  let customerId;
  let customerToken;

  let nearestProvProfileId;
  let fartherProvProfileId;
  let offlineProvProfileId;
  let unapprovedProvProfileId;

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

    // 1. Seed customer Priya
    const cust = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900081', 'customer', 'Priya Urgent', 'Pune')
      RETURNING id;
    `)[0];
    customerId = cust.id;
    customerToken = makeToken({ id: customerId, phone_number: '+919999900081', role: 'customer' });

    // 2. Seed Provider 1: Nearest (2 km away), Approved, Available, High Rating (4.9)
    const p1 = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900082', 'provider', 'Nearest Plumber Express', 'Pune')
      RETURNING id;
    `)[0];
    const prof1 = memDb.public.many(`
      INSERT INTO provider_profiles (
        user_id, kyc_status, categories, is_available, service_area_radius_km,
        base_location_lat, base_location_lng,
        avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
      )
      VALUES ('${p1.id}', 'approved', ARRAY['plumbing'], true, 15, 18.5100, 73.8100, 4.9, 5.0, 4.8)
      RETURNING id;
    `)[0];
    nearestProvProfileId = prof1.id;

    // 3. Seed Provider 2: Farther away (12 km), Approved, Available, Good Rating (4.2)
    const p2 = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900083', 'provider', 'Farther Plumber', 'Pune')
      RETURNING id;
    `)[0];
    const prof2 = memDb.public.many(`
      INSERT INTO provider_profiles (
        user_id, kyc_status, categories, is_available, service_area_radius_km,
        base_location_lat, base_location_lng,
        avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
      )
      VALUES ('${p2.id}', 'approved', ARRAY['plumbing'], true, 20, 18.6000, 73.8500, 4.2, 4.2, 4.2)
      RETURNING id;
    `)[0];
    fartherProvProfileId = prof2.id;

    // 4. Seed Provider 3: Very close (0.5 km) BUT is_available = FALSE (offline)
    const p3 = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900084', 'provider', 'Offline Plumber', 'Pune')
      RETURNING id;
    `)[0];
    const prof3 = memDb.public.many(`
      INSERT INTO provider_profiles (
        user_id, kyc_status, categories, is_available, service_area_radius_km,
        base_location_lat, base_location_lng,
        avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
      )
      VALUES ('${p3.id}', 'approved', ARRAY['plumbing'], false, 10, 18.5080, 73.8080, 5.0, 5.0, 5.0)
      RETURNING id;
    `)[0];
    offlineProvProfileId = prof3.id;

    // 5. Seed Provider 4: Very close (0.5 km) BUT kyc_status = 'pending' (unapproved)
    const p4 = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900085', 'provider', 'Unapproved KYC Plumber', 'Pune')
      RETURNING id;
    `)[0];
    const prof4 = memDb.public.many(`
      INSERT INTO provider_profiles (
        user_id, kyc_status, categories, is_available, service_area_radius_km,
        base_location_lat, base_location_lng,
        avg_rating_honesty, avg_rating_punctuality, avg_rating_quality
      )
      VALUES ('${p4.id}', 'pending', ARRAY['plumbing'], true, 10, 18.5080, 73.8080, 5.0, 5.0, 5.0)
      RETURNING id;
    `)[0];
    unapprovedProvProfileId = prof4.id;
  });

  it('Scenario B & Test Case 4: Posting an urgent job auto-matches the nearest available, approved provider', async () => {
    // Customer posts urgent plumbing job at (18.5074, 73.8077)
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        category: 'plumbing',
        urgency_type: 'urgent',
        description: 'Burst water pipe under kitchen sink flooding floor',
        area: 'Kothrud, Pune',
        lat: 18.5074,
        lng: 73.8077
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('job');
    expect(res.body).toHaveProperty('booking');

    const job = res.body.job;
    const booking = res.body.booking;

    // 1. Job is booked immediately
    expect(job.urgency_type).toEqual('urgent');
    expect(job.status).toEqual('booked');

    // 2. Booking is confirmed with the nearest available approved provider
    expect(booking).toBeDefined();
    expect(booking.job_id).toEqual(job.id);
    expect(booking.status).toEqual('confirmed');
    expect(booking.provider_id).toEqual(nearestProvProfileId);
    expect(booking.scheduled_at).toBeNull(); // Null for urgent jobs per 04_DATABASE_SCHEMA.md

    // 3. Auto-generated quote is priced at pre-set platform rate
    expect(booking.quote).toBeDefined();
    expect(booking.quote.price_paise).toEqual(PLATFORM_RATES_PAISE.plumbing);
    expect(booking.quote.status).toEqual('accepted');
    expect(booking.quote.message).toMatch(/standard platform rate/i);

    // 4. Provider details attached for direct UI confirmation
    expect(booking.provider.name).toEqual('Nearest Plumber Express');
    expect(booking.provider.distance_km).toBeLessThan(3.0);
  });

  it('rejects auto-match on a planned job with 400 NOT_URGENT_JOB', async () => {
    // Create a planned job
    const plannedJob = memDb.public.many(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
      VALUES ('${customerId}', 'plumbing', 'planned', 'Planned faucet upgrade', 'Kothrud', 18.5074, 73.8077, 'open')
      RETURNING id;
    `)[0];

    const res = await request(app)
      .post(`/api/v1/jobs/${plannedJob.id}/auto-match`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toEqual(400);
    expect(res.body.error.code).toEqual('NOT_URGENT_JOB');
  });

  it('returns booking=null if no eligible provider is available in radius', async () => {
    // Post an urgent electrical job where NO electrical providers exist
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        category: 'electrical',
        urgency_type: 'urgent',
        description: 'Sparking fuse box in hallway',
        area: 'Kothrud, Pune',
        lat: 18.5074,
        lng: 73.8077
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.job.urgency_type).toEqual('urgent');
    // Job stays open waiting for provider to be available
    expect(res.body.job.status).toEqual('open');
    expect(res.body.booking).toBeUndefined();
  });
});
