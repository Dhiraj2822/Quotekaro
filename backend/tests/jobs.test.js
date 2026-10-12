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

describe('Module 3 - Task 2: Job Posting & Retrieval Endpoints', () => {
  let memDb;
  let customerAToken;
  let customerBToken;
  let providerToken;
  let adminToken;
  let customerAId;
  let customerBId;
  let providerId;
  let adminId;
  let createdJobId;

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

    // Seed test users
    const uA = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900061', 'customer', 'Priya Sharma', 'Pune')
      RETURNING id;
    `)[0];
    customerAId = uA.id;
    customerAToken = makeToken({ id: customerAId, phone_number: '+919999900061', role: 'customer' });

    const uB = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900062', 'customer', 'Rohan Verma', 'Pune')
      RETURNING id;
    `)[0];
    customerBId = uB.id;
    customerBToken = makeToken({ id: customerBId, phone_number: '+919999900062', role: 'customer' });

    const uP = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900063', 'provider', 'Ramesh Plumber', 'Pune')
      RETURNING id;
    `)[0];
    providerId = uP.id;
    providerToken = makeToken({ id: providerId, phone_number: '+919999900063', role: 'provider' });

    const uAdm = memDb.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900064', 'admin', 'Super Admin', 'Pune')
      RETURNING id;
    `)[0];
    adminId = uAdm.id;
    adminToken = makeToken({ id: adminId, phone_number: '+919999900064', role: 'admin' });
  });

  describe('POST /api/v1/jobs', () => {
    it('blocks unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({ category: 'plumbing' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.error.code).toEqual('UNAUTHORIZED');
    });

    it('blocks provider role from creating a job with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${providerToken}`)
        .send({
          category: 'plumbing',
          urgency_type: 'planned',
          description: 'Bathroom pipe replacement',
          area: 'Kothrud, Pune',
          lat: 18.5074,
          lng: 73.8077
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('rejects invalid category with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          category: 'carpentry', // Not in MVP scope
          urgency_type: 'planned',
          description: 'Fix wooden door frame',
          area: 'Kothrud, Pune',
          lat: 18.5074,
          lng: 73.8077
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('VALIDATION_ERROR');
    });

    it('rejects painting job without photos (06_UIUX_SPEC.md §5 rule)', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          category: 'painting',
          urgency_type: 'planned',
          description: 'Paint living room two walls',
          photo_urls: [], // Empty photos not allowed for painting
          area: 'Baner, Pune',
          lat: 18.5590,
          lng: 73.7868
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error.code).toEqual('VALIDATION_ERROR');
      expect(res.body.error.message).toMatch(/Photo upload is mandatory for painting/i);
    });

    it('successfully creates a planned plumbing job with photos', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          category: 'plumbing',
          urgency_type: 'planned',
          description: 'Install new kitchen sink and tap fittings',
          photo_urls: ['https://storage.quotekaro.com/jobs/sink.jpg'],
          area: 'Kothrud, Pune',
          lat: 18.5074,
          lng: 73.8077
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('job');
      expect(res.body.job.id).toBeDefined();
      expect(res.body.job.customer_id).toEqual(customerAId);
      expect(res.body.job.category).toEqual('plumbing');
      expect(res.body.job.urgency_type).toEqual('planned');
      expect(res.body.job.status).toEqual('open');
      expect(res.body.job.customer_name).toEqual('Priya Sharma');

      createdJobId = res.body.job.id;
    });

    it('successfully creates an urgent plumbing job without mandatory photos (burst pipe)', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          category: 'plumbing',
          urgency_type: 'urgent',
          description: 'Emergency: Burst bathroom water pipe, water flooding',
          area: 'Kothrud, Pune',
          lat: 18.5074,
          lng: 73.8077
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.job.urgency_type).toEqual('urgent');
      expect(res.body.job.status).toEqual('open');
    });
  });

  describe('GET /api/v1/jobs/:id', () => {
    it('returns 404 NOT_FOUND for unknown job ID', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.error.code).toEqual('NOT_FOUND');
    });

    it('allows job owner (Customer A) to view their job details', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.job.id).toEqual(createdJobId);
      expect(res.body.job.customer_name).toEqual('Priya Sharma');
      expect(res.body.job.category).toEqual('plumbing');
    });

    it('BLOCKS Customer B from viewing Customer A job with 403 FORBIDDEN (Test Case 7)', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('allows provider to view open job details to review specifications', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${providerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.job.id).toEqual(createdJobId);
    });
  });

  describe('GET /api/v1/jobs?customer_id=', () => {
    it('returns jobs list for Customer A', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('jobs');
      expect(res.body.jobs.length).toBeGreaterThanOrEqual(1);
      expect(res.body.jobs[0].customer_id).toEqual(customerAId);
    });

    it('BLOCKS Customer B from querying Customer A jobs list with 403 FORBIDDEN (Test Case 7)', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs?customer_id=${customerAId}`)
        .set('Authorization', `Bearer ${customerBToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error.code).toEqual('FORBIDDEN');
    });

    it('allows Admin to query jobs filtered by customer_id', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs?customer_id=${customerAId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('jobs');
      expect(res.body.jobs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
