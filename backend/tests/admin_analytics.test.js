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

describe('Module 8 - Task 3: Admin Analytics Endpoint (GET /admin/analytics)', () => {
  let memDb;

  let adminUser, adminToken;
  let providerUser, providerToken;
  let customerUser, customerToken;

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

    // 1. Seed users
    adminUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900090', 'admin', 'Analytics Admin', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    adminToken = makeToken({ id: adminUser.id, phone_number: adminUser.phone_number, role: 'admin' });

    customerUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900091', 'customer', 'Pune Customer 1', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    customerToken = makeToken({ id: customerUser.id, phone_number: customerUser.phone_number, role: 'customer' });

    const customer2 = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900092', 'customer', 'Mumbai Customer 1', 'Mumbai')
      RETURNING id, phone_number, role;
    `)[0];

    providerUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900093', 'provider', 'Pune Electrician', 'Pune')
      RETURNING id, phone_number, role;
    `)[0];
    providerToken = makeToken({ id: providerUser.id, phone_number: providerUser.phone_number, role: 'provider' });

    const provider2 = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900094', 'provider', 'Mumbai Plumber', 'Mumbai')
      RETURNING id, phone_number, role;
    `)[0];

    // 2. Seed provider profiles (Pune active, Mumbai active)
    const pp1 = memDb.public.many(`
      INSERT INTO provider_profiles (user_id, kyc_status, is_available, categories)
      VALUES ('${providerUser.id}', 'approved', true, ARRAY['electrical'])
      RETURNING id;
    `)[0];

    const pp2 = memDb.public.many(`
      INSERT INTO provider_profiles (user_id, kyc_status, is_available, categories)
      VALUES ('${provider2.id}', 'approved', true, ARRAY['plumbing'])
      RETURNING id;
    `)[0];

    // 3. Seed jobs, quotes, bookings in Pune and Mumbai
    // Pune job 1: completed, electrical, 150000 paise (₹1500)
    const job1 = memDb.public.many(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area)
      VALUES ('${customerUser.id}', 'electrical', 'planned', 'Wiring repair', 'Shivaji Nagar')
      RETURNING id;
    `)[0];

    const quote1 = memDb.public.many(`
      INSERT INTO quotes (job_id, provider_id, price_paise, status)
      VALUES ('${job1.id}', '${pp1.id}', 150000, 'accepted')
      RETURNING id;
    `)[0];

    const booking1 = memDb.public.many(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
      VALUES ('${job1.id}', '${quote1.id}', '${customerUser.id}', '${pp1.id}', 'completed')
      RETURNING id;
    `)[0];

    // Pune job 2: in_progress, electrical, 250000 paise (₹2500)
    const job2 = memDb.public.many(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area)
      VALUES ('${customerUser.id}', 'electrical', 'urgent', 'Breaker trip', 'Kothrud')
      RETURNING id;
    `)[0];

    const quote2 = memDb.public.many(`
      INSERT INTO quotes (job_id, provider_id, price_paise, status)
      VALUES ('${job2.id}', '${pp1.id}', 250000, 'accepted')
      RETURNING id;
    `)[0];

    memDb.public.none(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
      VALUES ('${job2.id}', '${quote2.id}', '${customerUser.id}', '${pp1.id}', 'in_progress');
    `);

    // Mumbai job 3: completed, plumbing, 300000 paise (₹3000)
    const job3 = memDb.public.many(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area)
      VALUES ('${customer2.id}', 'plumbing', 'planned', 'Pipe leakage fix', 'Andheri')
      RETURNING id;
    `)[0];

    const quote3 = memDb.public.many(`
      INSERT INTO quotes (job_id, provider_id, price_paise, status)
      VALUES ('${job3.id}', '${pp2.id}', 300000, 'accepted')
      RETURNING id;
    `)[0];

    const booking3 = memDb.public.many(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
      VALUES ('${job3.id}', '${quote3.id}', '${customer2.id}', '${pp2.id}', 'completed')
      RETURNING id;
    `)[0];

    // 4. Seed disputes
    memDb.public.none(`
      INSERT INTO disputes (booking_id, raised_by, reason, status)
      VALUES ('${booking1.id}', '${customerUser.id}', 'Minor switch defect', 'open');

      INSERT INTO disputes (booking_id, raised_by, reason, status, resolution_notes)
      VALUES ('${booking3.id}', '${customer2.id}', 'Pipe washer issue', 'resolved', 'Fixed by provider free of charge');
    `);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('1. RBAC & Authorization Protection (08_TESTING_STRATEGY.md §2 Test Case 8)', () => {
    it('rejects a provider with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects a customer with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('2. Admin Analytics Aggregation (GET /admin/analytics)', () => {
    let analytics;

    beforeAll(async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      analytics = res.body;
    });

    it('returns the required structure with summary, city_wise, category_breakdown, and disputes_overview', () => {
      expect(analytics).toHaveProperty('summary');
      expect(analytics).toHaveProperty('city_wise');
      expect(analytics).toHaveProperty('category_breakdown');
      expect(analytics).toHaveProperty('disputes_overview');
    });

    it('calculates accurate overall summary KPIs', () => {
      const { summary } = analytics;
      expect(summary.total_bookings).toBe(3);
      expect(summary.completed_bookings).toBe(2);
      expect(summary.in_progress_bookings).toBe(1);
      // Completed GMV = 150000 (job1) + 300000 (job3) = 450000 paise
      expect(summary.gmv_paise).toBe(450000);
      // Universal 10% platform revenue = 45000 paise (₹450)
      expect(summary.platform_revenue_paise).toBe(45000);
      // Active approved providers
      expect(summary.active_providers).toBe(2);
      // Total customers
      expect(summary.total_customers).toBe(2);
    });

    it('aggregates city-wise booking counts, GMV, and active providers per 05_API_SPEC.md', () => {
      const { city_wise } = analytics;
      expect(Array.isArray(city_wise)).toBe(true);
      expect(city_wise.length).toBeGreaterThanOrEqual(2);

      const pune = city_wise.find(c => c.city === 'Pune');
      expect(pune).toBeDefined();
      expect(pune.booking_count).toBe(2);
      expect(pune.gmv_paise).toBe(150000); // Only completed job1 counts towards GMV
      expect(pune.active_providers).toBe(1);

      const mumbai = city_wise.find(c => c.city === 'Mumbai');
      expect(mumbai).toBeDefined();
      expect(mumbai.booking_count).toBe(1);
      expect(mumbai.gmv_paise).toBe(300000);
      expect(mumbai.active_providers).toBe(1);
    });

    it('aggregates category breakdown with job counts, booking counts, and GMV', () => {
      const { category_breakdown } = analytics;
      expect(Array.isArray(category_breakdown)).toBe(true);

      const electrical = category_breakdown.find(c => c.category === 'electrical');
      expect(electrical).toBeDefined();
      expect(electrical.job_count).toBe(2);
      expect(electrical.booking_count).toBe(2);
      expect(electrical.gmv_paise).toBe(150000);

      const plumbing = category_breakdown.find(c => c.category === 'plumbing');
      expect(plumbing).toBeDefined();
      expect(plumbing.job_count).toBe(1);
      expect(plumbing.booking_count).toBe(1);
      expect(plumbing.gmv_paise).toBe(300000);
    });

    it('aggregates dispute counts in disputes_overview', () => {
      const { disputes_overview } = analytics;
      expect(disputes_overview.total).toBe(2);
      expect(disputes_overview.open).toBe(1);
      expect(disputes_overview.resolved).toBe(1);
      expect(disputes_overview.under_review).toBe(0);
    });
  });
});
