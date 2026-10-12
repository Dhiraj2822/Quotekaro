const { newDb } = require('pg-mem');
const crypto = require('crypto');

describe('Module 3 - Task 1: jobs Table Migration', () => {
  let db;
  let customerId;

  beforeAll(() => {
    db = newDb();
    db.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      returns: db.public.getType('uuid'),
      implementation: () => crypto.randomUUID()
    });

    db.public.none(`
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

      CREATE INDEX IF NOT EXISTS idx_jobs_category_area_status ON jobs(category, area, status);
      CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(lat, lng);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    `);

    const userRes = db.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919999900051', 'customer', 'Kavita Client', 'Pune')
      RETURNING id;
    `);
    customerId = userRes[0].id;
  });

  it('allows inserting a valid job with default status=open and generated UUID', () => {
    const res = db.public.many(`
      INSERT INTO jobs (
        customer_id, category, urgency_type, description, photo_urls, area, lat, lng
      )
      VALUES (
        '${customerId}', 'plumbing', 'urgent', 'Kitchen pipe leak under sink',
        ARRAY['https://storage.quotekaro.com/jobs/leak1.jpg'], 'Kothrud, Pune', 18.5074, 73.8077
      )
      RETURNING *;
    `);

    expect(res).toHaveLength(1);
    const job = res[0];
    expect(job.id).toBeDefined();
    expect(job.customer_id).toEqual(customerId);
    expect(job.category).toEqual('plumbing');
    expect(job.urgency_type).toEqual('urgent');
    expect(job.status).toEqual('open');
    expect(job.description).toEqual('Kitchen pipe leak under sink');
    expect(job.photo_urls).toEqual(['https://storage.quotekaro.com/jobs/leak1.jpg']);
    expect(job.area).toEqual('Kothrud, Pune');
    expect(parseFloat(job.lat)).toBeCloseTo(18.5074);
    expect(parseFloat(job.lng)).toBeCloseTo(73.8077);
  });

  it('rejects invalid urgency_type not in urgency_type_enum', () => {
    expect(() => {
      db.public.none(`
        INSERT INTO jobs (customer_id, category, urgency_type)
        VALUES ('${customerId}', 'electrical', 'immediate');
      `);
    }).toThrow();
  });

  it('rejects invalid status not in job_status_enum', () => {
    expect(() => {
      db.public.none(`
        INSERT INTO jobs (customer_id, category, urgency_type, status)
        VALUES ('${customerId}', 'electrical', 'planned', 'active');
      `);
    }).toThrow();
  });

  it('rejects insertion with non-existent customer_id', () => {
    expect(() => {
      db.public.none(`
        INSERT INTO jobs (customer_id, category, urgency_type)
        VALUES ('00000000-0000-0000-0000-000000000000', 'painting', 'planned');
      `);
    }).toThrow();
  });
});
