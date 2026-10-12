const { newDb } = require('pg-mem');
const crypto = require('crypto');
const db = require('../src/config/db');
const { seed } = require('../src/seeds/seed_demo_data');

describe('Module 9 - Task 4: Jury Demo Seed Script Verification', () => {
  let memDb;

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
        service_area_radius_km INTEGER DEFAULT 25,
        base_location_lat DECIMAL,
        base_location_lng DECIMAL,
        is_available BOOLEAN DEFAULT false,
        wallet_balance_paise INTEGER DEFAULT 0,
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

      CREATE TABLE IF NOT EXISTS booking_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id),
        sender_id UUID NOT NULL REFERENCES users(id),
        message TEXT NOT NULL,
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

      CREATE TABLE IF NOT EXISTS wallet_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id),
        booking_id UUID REFERENCES bookings(id),
        entry_type VARCHAR(50) NOT NULL,
        amount_paise INTEGER NOT NULL,
        balance_after_paise INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) UNIQUE,
        rating_honesty SMALLINT NOT NULL,
        rating_punctuality SMALLINT NOT NULL,
        rating_quality SMALLINT NOT NULL,
        review_text TEXT,
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
      const trimmed = text.trim();
      if (trimmed === 'BEGIN' || trimmed === 'COMMIT' || trimmed === 'ROLLBACK') {
        return { rows: [], rowCount: 0 };
      }

      // Handle TRUNCATE in pg-mem
      if (trimmed.startsWith('TRUNCATE TABLE')) {
        const tables = ['disputes', 'ratings', 'wallet_ledger', 'payments', 'booking_messages', 'bookings', 'quotes', 'jobs', 'provider_profiles', 'users'];
        tables.forEach(t => {
          try { memDb.public.none(`DELETE FROM ${t};`); } catch (e) {}
        });
        return { rows: [], rowCount: 0 };
      }

      let queryStr = text;
      // Replace INTERVAL syntax for pg-mem compatibility if present
      queryStr = queryStr.replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*hours?'/gi, "NOW()");

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

    jest.spyOn(db, 'getClient').mockImplementation(() => {
      return Promise.resolve({
        query: (text, params) => Promise.resolve(executeSql(text, params)),
        release: () => {}
      });
    });

    jest.spyOn(db, 'query').mockImplementation((text, params) => {
      return Promise.resolve(executeSql(text, params));
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('runs seed script and populates all 4 demonstration scenarios', async () => {
    await seed();

    // 1. Verify Admin exists
    const adminRows = memDb.public.many("SELECT * FROM users WHERE role = 'admin'");
    expect(adminRows.length).toBe(1);
    expect(adminRows[0].phone_number).toBe('+919999900000');

    // 2. Verify Customers
    const customers = memDb.public.many("SELECT * FROM users WHERE role = 'customer'");
    expect(customers.length).toBe(3);

    // 3. Verify Providers & KYC Gates (Scenario D)
    const approvedProviders = memDb.public.many("SELECT * FROM provider_profiles WHERE kyc_status = 'approved'");
    expect(approvedProviders.length).toBe(4);

    const pendingProviders = memDb.public.many("SELECT * FROM provider_profiles WHERE kyc_status = 'pending'");
    expect(pendingProviders.length).toBe(1);

    const lowBalanceProvider = memDb.public.many("SELECT * FROM provider_profiles WHERE wallet_balance_paise < 10000");
    expect(lowBalanceProvider.length).toBe(1);
    expect(lowBalanceProvider[0].wallet_balance_paise).toBe(5000); // ₹50

    // 4. Verify Scenario A: Planned painting job has 3 quotes
    const quotes = memDb.public.many("SELECT * FROM quotes WHERE job_id = '50000000-0000-0000-0000-000000000001'");
    expect(quotes.length).toBe(3);
    const prices = quotes.map(q => q.price_paise).sort((a, b) => a - b);
    expect(prices).toEqual([800000, 950000, 1200000]); // ₹8,000, ₹9,500, ₹12,000

    // 5. Verify Scenario B: Urgent plumbing job with immediate booking
    const urgentBooking = memDb.public.many("SELECT * FROM bookings WHERE job_id = '50000000-0000-0000-0000-000000000002'");
    expect(urgentBooking.length).toBe(1);
    expect(urgentBooking[0].status).toBe('en_route');

    // 6. Verify Scenario C: Completed cash booking with 10% commission deduction
    const cashBooking = memDb.public.many("SELECT * FROM bookings WHERE id = '70000000-0000-0000-0000-000000000003'");
    expect(cashBooking.length).toBe(1);
    expect(cashBooking[0].status).toBe('completed');
    expect(cashBooking[0].before_photo_url).toBeDefined();
    expect(cashBooking[0].after_photo_url).toBeDefined();

    const payment = memDb.public.many("SELECT * FROM payments WHERE booking_id = '70000000-0000-0000-0000-000000000003'");
    expect(payment.length).toBe(1);
    expect(payment[0].method).toBe('cash');
    expect(payment[0].amount_paise).toBe(150000);

    const ledger = memDb.public.many("SELECT * FROM wallet_ledger WHERE booking_id = '70000000-0000-0000-0000-000000000003'");
    expect(ledger.length).toBe(1);
    expect(ledger[0].amount_paise).toBe(-15000); // -₹150 (10%)
    expect(ledger[0].entry_type).toBe('commission_deduction');

    const rating = memDb.public.many("SELECT * FROM ratings WHERE booking_id = '70000000-0000-0000-0000-000000000003'");
    expect(rating.length).toBe(1);
    expect(rating[0].rating_honesty).toBe(5);

    // 7. Verify Dispute
    const disputes = memDb.public.many("SELECT * FROM disputes WHERE status = 'open'");
    expect(disputes.length).toBe(1);
  });
});
