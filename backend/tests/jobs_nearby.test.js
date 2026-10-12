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

describe('Module 3 - Task 3: Provider Nearby Jobs Matching Endpoints (GET /jobs/nearby)', () => {
  let memDb;
  let customerToken;
  let plumberToken;
  let painterToken;
  let customerId;
  let plumberUserId;
  let painterUserId;

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
            val = param.length === 0 ? 'ARRAY[]::text[]' : `ARRAY[${param.map(p => `'${p}'`).join(', ')}]::text[]`;
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

    // Seed users
    const cUser = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900071', 'customer', 'Sunita Customer', 'Pune')
      RETURNING id;
    `)[0];
    customerId = cUser.id;
    customerToken = makeToken({ id: customerId, phone_number: '+919999900071', role: 'customer' });

    // Seed Plumber in Pune Central (18.5204, 73.8567) with radius 15 km
    const pPlumber = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900072', 'provider', 'Prakash Plumber', 'Pune')
      RETURNING id;
    `)[0];
    plumberUserId = pPlumber.id;
    plumberToken = makeToken({ id: plumberUserId, phone_number: '+919999900072', role: 'provider' });

    memDb.public.none(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories, service_area_radius_km, base_location_lat, base_location_lng, is_available)
      VALUES ('${plumberUserId}', 'approved', ARRAY['plumbing']::text[], 15, 18.5204, 73.8567, true);
    `);

    // Seed Painter in Pune Central
    const pPainter = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900073', 'provider', 'Dinesh Painter', 'Pune')
      RETURNING id;
    `)[0];
    painterUserId = pPainter.id;
    painterToken = makeToken({ id: painterUserId, phone_number: '+919999900073', role: 'provider' });

    memDb.public.none(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories, service_area_radius_km, base_location_lat, base_location_lng, is_available)
      VALUES ('${painterUserId}', 'approved', ARRAY['painting']::text[], 15, 18.5204, 73.8567, true);
    `);

    // Seed Jobs:
    // 1. Nearby Open Plumbing Job (Kothrud, Pune: ~6 km from central, planned)
    memDb.public.none(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
      VALUES ('${customerId}', 'plumbing', 'planned', 'Install bathroom taps', 'Kothrud, Pune', 18.5074, 73.8077, 'open');
    `);

    // 2. Nearby Urgent Plumbing Job (Shivajinagar, Pune: ~2 km from central, urgent)
    memDb.public.none(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
      VALUES ('${customerId}', 'plumbing', 'urgent', 'Kitchen pipe burst emergency', 'Shivajinagar, Pune', 18.5314, 73.8446, 'open');
    `);

    // 3. Distant Plumbing Job (Lonavala: ~65 km away, outside 15 km radius)
    memDb.public.none(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
      VALUES ('${customerId}', 'plumbing', 'planned', 'Farmhouse water tank issue', 'Lonavala', 18.7557, 73.4091, 'open');
    `);

    // 4. Nearby Painting Job (Kothrud: ~6 km, planned)
    memDb.public.none(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
      VALUES ('${customerId}', 'painting', 'planned', 'Living room wall painting', 'Kothrud, Pune', 18.5074, 73.8077, 'open');
    `);

    // 5. Booked Job (Should be excluded from open nearby feeds)
    memDb.public.none(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng, status)
      VALUES ('${customerId}', 'plumbing', 'planned', 'Already booked repair', 'Kothrud, Pune', 18.5074, 73.8077, 'booked');
    `);
  });

  it('blocks customer role from accessing provider job feed with 403 FORBIDDEN', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/nearby')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.statusCode).toEqual(403);
    expect(res.body.error.code).toEqual('FORBIDDEN');
  });

  it('returns open nearby jobs matching the provider profile categories and radius', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/nearby')
      .set('Authorization', `Bearer ${plumberToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('jobs');
    const jobs = res.body.jobs;

    // Should contain the 2 nearby plumbing jobs, NOT the distant one (Lonavala) and NOT the painting job
    expect(jobs).toHaveLength(2);
    expect(jobs.every(j => j.category === 'plumbing')).toBe(true);
    expect(jobs.every(j => j.status === 'open')).toBe(true);

    // Urgent job should be prioritized first
    expect(jobs[0].urgency_type).toEqual('urgent');
    expect(jobs[0].area).toEqual('Shivajinagar, Pune');
    expect(jobs[0].distance_km).toBeDefined();
    expect(jobs[0].distance_km).toBeLessThanOrEqual(15);

    // Second job is the planned Kothrud job
    expect(jobs[1].urgency_type).toEqual('planned');
    expect(jobs[1].area).toEqual('Kothrud, Pune');
  });

  it('filters by category for a painter provider', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/nearby')
      .set('Authorization', `Bearer ${painterToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0].category).toEqual('painting');
    expect(res.body.jobs[0].description).toEqual('Living room wall painting');
  });

  it('allows overriding category and search radius via query parameters', async () => {
    // Search with expanded radius of 100 km to include distant Lonavala job
    const res = await request(app)
      .get('/api/v1/jobs/nearby?category=plumbing&lat=18.5204&lng=73.8567&radius_km=100')
      .set('Authorization', `Bearer ${plumberToken}`);

    expect(res.statusCode).toEqual(200);
    // Should now include all 3 open plumbing jobs (including Lonavala)
    expect(res.body.jobs).toHaveLength(3);
    const lonavalaJob = res.body.jobs.find(j => j.area === 'Lonavala');
    expect(lonavalaJob).toBeDefined();
    expect(lonavalaJob.distance_km).toBeGreaterThan(50);
  });

  it('excludes non-open jobs (status = booked, completed, cancelled)', async () => {
    const res = await request(app)
      .get('/api/v1/jobs/nearby?category=plumbing&radius_km=100')
      .set('Authorization', `Bearer ${plumberToken}`);

    expect(res.statusCode).toEqual(200);
    const hasBooked = res.body.jobs.some(j => j.description === 'Already booked repair');
    expect(hasBooked).toBe(false);
  });
});
