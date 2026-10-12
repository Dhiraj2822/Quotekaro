const { newDb } = require('pg-mem');
const crypto = require('crypto');

describe('Module 4 - Task 1: quotes and bookings Tables Migration', () => {
  let db;
  let customerId;
  let providerUserId1;
  let providerProfileId1;
  let providerUserId2;
  let providerProfileId2;
  let jobId;

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

      -- Migration 004 DDL
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

      CREATE INDEX IF NOT EXISTS idx_quotes_job_id ON quotes(job_id);
      CREATE INDEX IF NOT EXISTS idx_quotes_provider_id ON quotes(provider_id);

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

      CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    `);

    // Seed test customer
    const userCustomer = db.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919876543210', 'customer', 'Rohan Customer', 'Pune')
      RETURNING id;
    `);
    customerId = userCustomer[0].id;

    // Seed test provider 1
    const userProv1 = db.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919876543211', 'provider', 'Ramesh Electrician', 'Pune')
      RETURNING id;
    `);
    providerUserId1 = userProv1[0].id;

    const profileProv1 = db.public.many(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories, is_available)
      VALUES ('${providerUserId1}', 'approved', ARRAY['electrical'], true)
      RETURNING id;
    `);
    providerProfileId1 = profileProv1[0].id;

    // Seed test provider 2
    const userProv2 = db.public.many(`
      INSERT INTO users (phone_number, role, name, city)
      VALUES ('+919876543212', 'provider', 'Suresh Electrician', 'Pune')
      RETURNING id;
    `);
    providerUserId2 = userProv2[0].id;

    const profileProv2 = db.public.many(`
      INSERT INTO provider_profiles (user_id, kyc_status, categories, is_available)
      VALUES ('${providerUserId2}', 'approved', ARRAY['electrical'], true)
      RETURNING id;
    `);
    providerProfileId2 = profileProv2[0].id;

    // Seed test job
    const jobRes = db.public.many(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, area, lat, lng)
      VALUES ('${customerId}', 'electrical', 'planned', 'Switchboard sparking', 'Kothrud', 18.5074, 73.8077)
      RETURNING id;
    `);
    jobId = jobRes[0].id;
  });

  describe('Quotes Table', () => {
    let quote1Id;

    it('allows inserting a valid quote with default status=pending', () => {
      const res = db.public.many(`
        INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message)
        VALUES ('${jobId}', '${providerProfileId1}', 45000, 30, 'Can arrive in 30 mins with spare parts')
        RETURNING *;
      `);

      expect(res).toHaveLength(1);
      const quote = res[0];
      expect(quote.id).toBeDefined();
      quote1Id = quote.id;
      expect(quote.job_id).toEqual(jobId);
      expect(quote.provider_id).toEqual(providerProfileId1);
      expect(quote.price_paise).toEqual(45000);
      expect(quote.eta_minutes).toEqual(30);
      expect(quote.message).toEqual('Can arrive in 30 mins with spare parts');
      expect(quote.status).toEqual('pending');
    });

    it('enforces UNIQUE constraint on (job_id, provider_id) — one quote per provider per job', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message)
          VALUES ('${jobId}', '${providerProfileId1}', 40000, 25, 'Revised quote attempt')
        `);
      }).toThrow();
    });

    it('allows a second provider to quote on the same job', () => {
      const res = db.public.many(`
        INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message)
        VALUES ('${jobId}', '${providerProfileId2}', 42000, 45, 'Specialized in wiring')
        RETURNING *;
      `);

      expect(res).toHaveLength(1);
      expect(res[0].provider_id).toEqual(providerProfileId2);
      expect(res[0].price_paise).toEqual(42000);
      expect(res[0].status).toEqual('pending');
    });

    it('rejects invalid quote_status not in quote_status_enum', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO quotes (job_id, provider_id, price_paise, status)
          VALUES ('${jobId}', '00000000-0000-0000-0000-000000000000', 30000, 'in_review');
        `);
      }).toThrow();
    });

    it('rejects quote insertion without price_paise (NOT NULL constraint)', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO quotes (job_id, provider_id)
          VALUES ('${jobId}', '${providerProfileId1}');
        `);
      }).toThrow();
    });
  });

  describe('Bookings Table', () => {
    let quoteId;

    beforeAll(() => {
      const qRes = db.public.many(`
        SELECT id FROM quotes WHERE job_id = '${jobId}' AND provider_id = '${providerProfileId1}';
      `);
      quoteId = qRes[0].id;
    });

    it('allows creating a booking linked to job, quote, customer, provider with default status=confirmed', () => {
      const res = db.public.many(`
        INSERT INTO bookings (job_id, quote_id, customer_id, provider_id)
        VALUES ('${jobId}', '${quoteId}', '${customerId}', '${providerProfileId1}')
        RETURNING *;
      `);

      expect(res).toHaveLength(1);
      const booking = res[0];
      expect(booking.id).toBeDefined();
      expect(booking.job_id).toEqual(jobId);
      expect(booking.quote_id).toEqual(quoteId);
      expect(booking.customer_id).toEqual(customerId);
      expect(booking.provider_id).toEqual(providerProfileId1);
      expect(booking.status).toEqual('confirmed');
      expect(booking.scheduled_at).toBeNull();
      expect(booking.completed_at).toBeNull();
    });

    it('enforces UNIQUE constraint on job_id (one booking per job)', () => {
      expect(() => {
        db.public.none(`
          INSERT INTO bookings (job_id, quote_id, customer_id, provider_id)
          VALUES ('${jobId}', '${quoteId}', '${customerId}', '${providerProfileId2}');
        `);
      }).toThrow();
    });

    it('rejects invalid status not in booking_status_enum', () => {
      // Create another job to test invalid booking status
      const job2 = db.public.many(`
        INSERT INTO jobs (customer_id, category, urgency_type)
        VALUES ('${customerId}', 'plumbing', 'urgent')
        RETURNING id;
      `)[0].id;

      expect(() => {
        db.public.none(`
          INSERT INTO bookings (job_id, customer_id, provider_id, status)
          VALUES ('${job2}', '${customerId}', '${providerProfileId1}', 'started');
        `);
      }).toThrow();
    });
  });
});
