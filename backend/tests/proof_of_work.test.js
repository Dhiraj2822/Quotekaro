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

describe('Module 7 - Task 3: Before/After Proof-of-Work Photo Upload on Job Completion', () => {
  let memDb;

  let customerId;
  let customerToken;

  let otherCustomerId;
  let otherCustomerToken;

  let providerUserId;
  let providerProfileId;
  let providerToken;

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

      CREATE TABLE IF NOT EXISTS wallet_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id),
        booking_id UUID REFERENCES bookings(id),
        entry_type VARCHAR(50) NOT NULL,
        amount_paise INTEGER NOT NULL,
        balance_after_paise INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) UNIQUE,
        amount_paise INTEGER NOT NULL,
        method VARCHAR(20) NOT NULL,
        gateway_txn_id VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
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
    memDb.public.none('DELETE FROM payments;');
    memDb.public.none('DELETE FROM wallet_ledger;');
    memDb.public.none('DELETE FROM bookings;');
    memDb.public.none('DELETE FROM quotes;');
    memDb.public.none('DELETE FROM jobs;');
    memDb.public.none('DELETE FROM provider_profiles;');
    memDb.public.none('DELETE FROM users;');

    const u1 = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900061', 'customer', 'Sunil Customer', 'Pune')
      RETURNING id;
    `);
    customerId = u1.id;
    customerToken = makeToken({ id: customerId, role: 'customer', phone_number: '+919999900061' });

    const u2 = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900062', 'customer', 'Other Customer', 'Pune')
      RETURNING id;
    `);
    otherCustomerId = u2.id;
    otherCustomerToken = makeToken({ id: otherCustomerId, role: 'customer', phone_number: '+919999900062' });

    const pU = memDb.public.one(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900063', 'provider', 'Ganesh Plumber', 'Pune')
      RETURNING id;
    `);
    providerUserId = pU.id;
    providerToken = makeToken({ id: providerUserId, role: 'provider', phone_number: '+919999900063' });

    const pP = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, categories, wallet_balance_paise)
      VALUES ('${providerUserId}', ARRAY['plumbing'], 50000)
      RETURNING id;
    `);
    providerProfileId = pP.id;

    // Job with initial photo uploaded by customer
    const j = memDb.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, photo_urls, status)
      VALUES ('${customerId}', 'plumbing', 'planned', 'Kitchen pipe leaking', ARRAY['https://cdn.quotekaro.com/jobs/initial_leak.jpg'], 'open')
      RETURNING id;
    `);
    testJobId = j.id;

    const q = memDb.public.one(`
      INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, status)
      VALUES ('${testJobId}', '${providerProfileId}', 45000, 25, 'accepted')
      RETURNING id;
    `);
    testQuoteId = q.id;

    const b = memDb.public.one(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
      VALUES ('${testJobId}', '${testQuoteId}', '${customerId}', '${providerProfileId}', 'confirmed')
      RETURNING id;
    `);
    testBookingId = b.id;
  });

  it('allows provider to attach before_photo_url when transitioning to in_progress', async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${testBookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        status: 'in_progress',
        before_photo_url: 'https://cdn.quotekaro.com/bookings/work_start_before.jpg'
      });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('in_progress');
    expect(res.body.booking.before_photo_url).toBe('https://cdn.quotekaro.com/bookings/work_start_before.jpg');

    // Verify in database
    const booking = memDb.public.one(`SELECT before_photo_url, status FROM bookings WHERE id = '${testBookingId}';`);
    expect(booking.status).toBe('in_progress');
    expect(booking.before_photo_url).toBe('https://cdn.quotekaro.com/bookings/work_start_before.jpg');
  });

  it('allows updating before/after photos via PATCH /bookings/:id/photos', async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${testBookingId}/photos`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        before_photo_url: 'https://cdn.quotekaro.com/bookings/explicit_before.jpg',
        after_photo_url: 'https://cdn.quotekaro.com/bookings/explicit_after.jpg'
      });

    expect(res.status).toBe(200);
    expect(res.body.booking.before_photo_url).toBe('https://cdn.quotekaro.com/bookings/explicit_before.jpg');
    expect(res.body.booking.after_photo_url).toBe('https://cdn.quotekaro.com/bookings/explicit_after.jpg');
  });

  it('blocks unauthorized users from updating booking photos (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/bookings/${testBookingId}/photos`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({
        before_photo_url: 'https://cdn.quotekaro.com/bookings/hack.jpg'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('records after_photo_url and preserves before_photo_url on POST /bookings/:id/complete', async () => {
    // 1. Set before photo
    await request(app)
      .patch(`/api/v1/bookings/${testBookingId}/status`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        status: 'in_progress',
        before_photo_url: 'https://cdn.quotekaro.com/bookings/pipe_before.jpg'
      });

    // 2. Complete with after photo
    const completeRes = await request(app)
      .post(`/api/v1/bookings/${testBookingId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        after_photo_url: 'https://cdn.quotekaro.com/bookings/pipe_after_repaired.jpg'
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.booking.status).toBe('completed');
    expect(completeRes.body.booking.before_photo_url).toBe('https://cdn.quotekaro.com/bookings/pipe_before.jpg');
    expect(completeRes.body.booking.after_photo_url).toBe('https://cdn.quotekaro.com/bookings/pipe_after_repaired.jpg');

    // 3. Verify GET /bookings/:id returns both photos for customer
    const getRes = await request(app)
      .get(`/api/v1/bookings/${testBookingId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.booking.before_photo_url).toBe('https://cdn.quotekaro.com/bookings/pipe_before.jpg');
    expect(getRes.body.booking.after_photo_url).toBe('https://cdn.quotekaro.com/bookings/pipe_after_repaired.jpg');
  });

  it('falls back to job photo if before_photo_url was not explicitly set by provider', async () => {
    // Complete directly without separate before photo
    const completeRes = await request(app)
      .post(`/api/v1/bookings/${testBookingId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({
        after_photo_url: 'https://cdn.quotekaro.com/bookings/fixed_final.jpg'
      });

    expect(completeRes.status).toBe(200);
    // Should fallback to job.photo_urls[0] = 'https://cdn.quotekaro.com/jobs/initial_leak.jpg'
    expect(completeRes.body.booking.before_photo_url).toBe('https://cdn.quotekaro.com/jobs/initial_leak.jpg');
    expect(completeRes.body.booking.after_photo_url).toBe('https://cdn.quotekaro.com/bookings/fixed_final.jpg');
  });
});
