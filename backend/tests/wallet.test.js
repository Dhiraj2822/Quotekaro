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

describe('Module 6 - Task 5: Wallet Balance Threshold Enforcement & Topup Endpoints', () => {
  let memDb;

  let customerId;
  let customerToken;

  let providerAUserId;
  let providerAProfileId;
  let providerAToken;

  let providerBUserId;
  let providerBProfileId;
  let providerBToken;

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
        avg_rating_honesty DECIMAL DEFAULT 5.0,
        avg_rating_punctuality DECIMAL DEFAULT 5.0,
        avg_rating_quality DECIMAL DEFAULT 5.0,
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TYPE wallet_entry_type_enum AS ENUM ('commission_deduction', 'topup', 'payout');

      CREATE TABLE IF NOT EXISTS wallet_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE RESTRICT,
        booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
        entry_type wallet_entry_type_enum NOT NULL,
        amount_paise INTEGER NOT NULL,
        balance_after_paise INTEGER NOT NULL,
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
          } else if (typeof param === 'number') {
            val = `${param}`;
          } else if (typeof param === 'boolean') {
            val = param ? 'TRUE' : 'FALSE';
          } else {
            val = `'${String(param).replace(/'/g, "''")}'`;
          }
          const regex = new RegExp(`\\$${index + 1}(?!\\d)`, 'g');
          queryStr = queryStr.replace(regex, val);
        });
      }

      const res = memDb.public.query(queryStr);
      return {
        rows: res.rows || [],
        rowCount: res.rowCount !== undefined ? res.rowCount : (res.rows ? res.rows.length : 0)
      };
    }

    jest.spyOn(db, 'query').mockImplementation(async (text, params) => {
      return executeSql(text, params);
    });

    jest.spyOn(db, 'getClient').mockImplementation(async () => {
      return {
        query: async (text, params) => executeSql(text, params),
        release: () => {}
      };
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    memDb.public.none('DELETE FROM wallet_ledger;');
    memDb.public.none('DELETE FROM bookings;');
    memDb.public.none('DELETE FROM quotes;');
    memDb.public.none('DELETE FROM jobs;');
    memDb.public.none('DELETE FROM provider_profiles;');
    memDb.public.none('DELETE FROM users;');

    const cust = memDb.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900051', 'customer', 'Customer Wallet Test')
      RETURNING id, phone_number, role;
    `);
    customerId = cust.id;
    customerToken = makeToken({ id: customerId, phone_number: cust.phone_number, role: 'customer' });

    const provA = memDb.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900052', 'provider', 'Provider A')
      RETURNING id, phone_number, role;
    `);
    providerAUserId = provA.id;
    providerAToken = makeToken({ id: providerAUserId, phone_number: provA.phone_number, role: 'provider' });

    const pA = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, kyc_status, is_available, wallet_balance_paise, categories)
      VALUES ('${providerAUserId}', 'approved', true, 50000, ARRAY['plumbing'])
      RETURNING id;
    `);
    providerAProfileId = pA.id;

    const provB = memDb.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900053', 'provider', 'Provider B')
      RETURNING id, phone_number, role;
    `);
    providerBUserId = provB.id;
    providerBToken = makeToken({ id: providerBUserId, phone_number: provB.phone_number, role: 'provider' });

    const pB = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, kyc_status, is_available, wallet_balance_paise, categories)
      VALUES ('${providerBUserId}', 'approved', true, 50000, ARRAY['plumbing'])
      RETURNING id;
    `);
    providerBProfileId = pB.id;

    const j = memDb.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, status)
      VALUES ('${customerId}', 'plumbing', 'planned', 'Fix bathroom tap', 'open')
      RETURNING id;
    `);
    testJobId = j.id;
  });

  describe('GET /api/v1/providers/:id/wallet', () => {
    it('returns balance and ledger history for authorized provider', async () => {
      memDb.public.none(`
        INSERT INTO wallet_ledger (provider_id, booking_id, entry_type, amount_paise, balance_after_paise)
        VALUES ('${providerAProfileId}', NULL, 'topup', 25000, 50000);
      `);

      const res = await request(app)
        .get(`/api/v1/providers/${providerAProfileId}/wallet`)
        .set('Authorization', `Bearer ${providerAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.balance_paise).toBe(50000);
      expect(res.body.is_available).toBe(true);
      expect(res.body.min_threshold_paise).toBe(10000);
      expect(Array.isArray(res.body.ledger)).toBe(true);
      expect(res.body.ledger.length).toBe(1);
    });

    it('blocks Provider B from inspecting Provider A wallet (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/providers/${providerAProfileId}/wallet`)
        .set('Authorization', `Bearer ${providerBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/providers/:id/wallet/topup', () => {
    it('successfully tops up provider wallet (+₹200 / 20000 paise)', async () => {
      // Set initial low balance of 5000 paise (below ₹100 threshold)
      memDb.public.none(`
        UPDATE provider_profiles 
        SET wallet_balance_paise = 5000, is_available = false 
        WHERE id = '${providerAProfileId}';
      `);

      const res = await request(app)
        .post(`/api/v1/providers/${providerAProfileId}/wallet/topup`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ amount_paise: 20000, method: 'upi' });

      expect(res.status).toBe(200);
      expect(res.body.balance_paise).toBe(25000); // 5000 + 20000
      expect(res.body.is_available).toBe(true); // Restored because 25000 >= 10000
      expect(res.body.ledger_entry.amount_paise).toBe(20000);
      expect(res.body.ledger_entry.balance_after_paise).toBe(25000);

      // Verify DB row
      const profile = memDb.public.one(`SELECT * FROM provider_profiles WHERE id = '${providerAProfileId}'`);
      expect(profile.wallet_balance_paise).toBe(25000);
      expect(profile.is_available).toBe(true);
    });

    it('rejects invalid or non-positive topup amount (400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/v1/providers/${providerAProfileId}/wallet/topup`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ amount_paise: -500 });

      expect(res.status).toBe(400);
    });
  });

  describe('Threshold Gate: Blocks matches and quotes when balance is below minimum threshold (08_TESTING_STRATEGY.md §2.6)', () => {
    it('blocks provider from toggling is_available = true when balance < ₹100', async () => {
      // Depleted wallet balance (4000 paise = ₹40)
      memDb.public.none(`
        UPDATE provider_profiles 
        SET wallet_balance_paise = 4000, is_available = false 
        WHERE id = '${providerAProfileId}';
      `);

      const res = await request(app)
        .patch(`/api/v1/providers/${providerAProfileId}/availability`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ is_available: true });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_WALLET_BALANCE');

      const profile = memDb.public.one(`SELECT * FROM provider_profiles WHERE id = '${providerAProfileId}'`);
      expect(profile.is_available).toBe(false);
    });

    it('blocks low-balance provider from submitting quotes on open jobs (403 Forbidden)', async () => {
      memDb.public.none(`
        UPDATE provider_profiles 
        SET wallet_balance_paise = 4000 
        WHERE id = '${providerAProfileId}';
      `);

      const res = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({
          price_paise: 30000,
          eta_minutes: 20,
          message: 'Can do this now'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_WALLET_BALANCE');
    });

    it('excludes low-balance provider from urgent auto-match and matches funded provider instead', async () => {
      // Provider A has low balance (3000 paise)
      memDb.public.none(`
        UPDATE provider_profiles 
        SET wallet_balance_paise = 3000, is_available = true 
        WHERE id = '${providerAProfileId}';
      `);

      // Provider B has funded balance (50000 paise)
      memDb.public.none(`
        UPDATE provider_profiles 
        SET wallet_balance_paise = 50000, is_available = true 
        WHERE id = '${providerBProfileId}';
      `);

      // Customer posts urgent job
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          category: 'plumbing',
          urgency_type: 'urgent',
          description: 'Burst pipe urgent',
          area: 'Pune',
          lat: 18.5074,
          lng: 73.8077
        });

      expect(res.status).toBe(201);
      expect(res.body.booking).toBeDefined();
      // Only Provider B should be matched because Provider A has insufficient wallet balance!
      expect(res.body.booking.provider_id).toBe(providerBProfileId);
    });

    it('allows quoting again once provider tops up their wallet', async () => {
      // 1. Initial low balance prevents quote
      memDb.public.none(`
        UPDATE provider_profiles 
        SET wallet_balance_paise = 2000, is_available = false 
        WHERE id = '${providerAProfileId}';
      `);

      const failedQuote = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ price_paise: 30000, eta_minutes: 20, message: 'I can fix it' });
      expect(failedQuote.status).toBe(403);

      // 2. Provider tops up wallet (+₹150 / 15000 paise)
      const topupRes = await request(app)
        .post(`/api/v1/providers/${providerAProfileId}/wallet/topup`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ amount_paise: 15000 });
      expect(topupRes.status).toBe(200);
      expect(topupRes.body.balance_paise).toBe(17000); // 2000 + 15000 >= 10000

      // 3. Provider submits quote successfully
      const successQuote = await request(app)
        .post(`/api/v1/jobs/${testJobId}/quotes`)
        .set('Authorization', `Bearer ${providerAToken}`)
        .send({ price_paise: 30000, eta_minutes: 20, message: 'I can fix it' });
      expect(successQuote.status).toBe(201);
      expect(successQuote.body.quote.price_paise).toBe(30000);
    });
  });
});
