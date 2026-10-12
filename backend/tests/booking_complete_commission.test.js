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

describe('Module 6 - Task 4: Booking Completion & Universal Wallet Commission Deduction (Scenario C)', () => {
  let memDb;

  let customerId;
  let customerToken;
  let unauthorizedCustomerToken;

  let providerUserId;
  let providerProfileId;
  let providerToken;

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
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

      CREATE TYPE payment_method_enum AS ENUM ('upi', 'card', 'cash');
      CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed');
      CREATE TYPE wallet_entry_type_enum AS ENUM ('commission_deduction', 'topup', 'payout');

      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT UNIQUE,
        amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
        method payment_method_enum NOT NULL,
        gateway_txn_id VARCHAR(100),
        status payment_status_enum NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

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
            val = `ARRAY[${param.map(p => `'${p}'`).join(',')}]`;
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
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    memDb.public.none('DELETE FROM wallet_ledger;');
    memDb.public.none('DELETE FROM payments;');
    memDb.public.none('DELETE FROM bookings;');
    memDb.public.none('DELETE FROM quotes;');
    memDb.public.none('DELETE FROM jobs;');
    memDb.public.none('DELETE FROM provider_profiles;');
    memDb.public.none('DELETE FROM users;');

    const cust = memDb.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900041', 'customer', 'Customer Main')
      RETURNING id, phone_number, role;
    `);
    customerId = cust.id;
    customerToken = makeToken({ id: customerId, phone_number: cust.phone_number, role: 'customer' });

    const unauthCust = memDb.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900042', 'customer', 'Customer Other')
      RETURNING id, phone_number, role;
    `);
    unauthorizedCustomerToken = makeToken({ id: unauthCust.id, phone_number: unauthCust.phone_number, role: 'customer' });

    const provU = memDb.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900043', 'provider', 'Provider Main')
      RETURNING id, phone_number, role;
    `);
    providerUserId = provU.id;
    providerToken = makeToken({ id: providerUserId, phone_number: provU.phone_number, role: 'provider' });

    const provP = memDb.public.one(`
      INSERT INTO provider_profiles (user_id, kyc_status, is_available, wallet_balance_paise)
      VALUES ('${providerUserId}', 'approved', true, 50000)
      RETURNING id;
    `);
    providerProfileId = provP.id;
  });

  // Helper to create job, quote, and booking
  function createTestBooking({ pricePaise = 40000 }) {
    const job = memDb.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type, description, status)
      VALUES ('${customerId}', 'plumbing', 'planned', 'Kitchen faucet repair', 'booked')
      RETURNING id;
    `);

    const quote = memDb.public.one(`
      INSERT INTO quotes (job_id, provider_id, price_paise, eta_minutes, message, status)
      VALUES ('${job.id}', '${providerProfileId}', ${pricePaise}, 25, 'Ready to fix', 'accepted')
      RETURNING id;
    `);

    const booking = memDb.public.one(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
      VALUES ('${job.id}', '${quote.id}', '${customerId}', '${providerProfileId}', 'in_progress')
      RETURNING id;
    `);

    return { jobId: job.id, quoteId: quote.id, bookingId: booking.id };
  }

  it('Scenario C Part 1 (Cash): Deducts 10% commission on job completion with cash payment', async () => {
    const { bookingId } = createTestBooking({ pricePaise: 40000 }); // ₹400 job

    // Customer creates cash payment intent
    memDb.public.none(`
      INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
      VALUES ('${bookingId}', 40000, 'cash', NULL, 'pending');
    `);

    // Provider completes job
    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ after_photo_url: 'https://storage.quotekaro.com/after_1.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('completed');
    expect(res.body.booking.after_photo_url).toBe('https://storage.quotekaro.com/after_1.jpg');

    // Commission verification: 10% of 40000 = 4000 paise (₹40)
    expect(res.body.wallet_deduction.commission_paise).toBe(4000);
    expect(res.body.wallet_deduction.amount_paise).toBe(-4000);
    expect(res.body.wallet_deduction.balance_after_paise).toBe(46000); // 50000 - 4000

    // Database wallet_ledger verification
    const ledgerRows = memDb.public.many(`
      SELECT * FROM wallet_ledger WHERE provider_id = '${providerProfileId}'
    `);
    expect(ledgerRows.length).toBe(1);
    expect(ledgerRows[0].entry_type).toBe('commission_deduction');
    expect(ledgerRows[0].amount_paise).toBe(-4000);
    expect(ledgerRows[0].balance_after_paise).toBe(46000);
    expect(ledgerRows[0].booking_id).toBe(bookingId);

    // Provider profile balance updated
    const profile = memDb.public.one(`SELECT * FROM provider_profiles WHERE id = '${providerProfileId}'`);
    expect(profile.wallet_balance_paise).toBe(46000);

    // Cash payment record marked completed
    const payment = memDb.public.one(`SELECT * FROM payments WHERE booking_id = '${bookingId}'`);
    expect(payment.status).toBe('completed');
    expect(payment.method).toBe('cash');
  });

  it('Scenario C Part 2 (Digital/UPI): Deducts identical 10% commission on digital payment completion', async () => {
    const { bookingId } = createTestBooking({ pricePaise: 40000 }); // ₹400 job

    // Customer paid via UPI
    memDb.public.none(`
      INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
      VALUES ('${bookingId}', 40000, 'upi', 'pay_digital_test_123', 'completed');
    `);

    // Provider completes job
    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({ after_photo_url: 'https://storage.quotekaro.com/after_2.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('completed');

    // Commission verification: identical 4000 paise deduction
    expect(res.body.wallet_deduction.commission_paise).toBe(4000);
    expect(res.body.wallet_deduction.amount_paise).toBe(-4000);
    expect(res.body.wallet_deduction.balance_after_paise).toBe(46000);

    const ledgerRows = memDb.public.many(`
      SELECT * FROM wallet_ledger WHERE provider_id = '${providerProfileId}'
    `);
    expect(ledgerRows.length).toBe(1);
    expect(ledgerRows[0].amount_paise).toBe(-4000);
    expect(ledgerRows[0].balance_after_paise).toBe(46000);
  });

  it('Scenario C Equality Gate: Asserts cash and digital commission deductions are mathematically identical', async () => {
    // 1. Cash run
    const bookingCash = createTestBooking({ pricePaise: 60000 });
    memDb.public.none(`
      INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
      VALUES ('${bookingCash.bookingId}', 60000, 'cash', NULL, 'pending');
    `);
    const resCash = await request(app)
      .post(`/api/v1/bookings/${bookingCash.bookingId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({});

    // Reset ledger & profile balance for digital run comparison
    memDb.public.none(`DELETE FROM wallet_ledger;`);
    memDb.public.none(`UPDATE provider_profiles SET wallet_balance_paise = 50000 WHERE id = '${providerProfileId}';`);

    // 2. Digital run
    const bookingDigital = createTestBooking({ pricePaise: 60000 });
    memDb.public.none(`
      INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
      VALUES ('${bookingDigital.bookingId}', 60000, 'upi', 'pay_123', 'completed');
    `);
    const resDigital = await request(app)
      .post(`/api/v1/bookings/${bookingDigital.bookingId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({});

    // Equality Assertion: Cash vs Digital
    expect(resCash.body.wallet_deduction.commission_paise).toBe(resDigital.body.wallet_deduction.commission_paise);
    expect(resCash.body.wallet_deduction.amount_paise).toBe(resDigital.body.wallet_deduction.amount_paise);
    expect(resCash.body.wallet_deduction.balance_after_paise).toBe(resDigital.body.wallet_deduction.balance_after_paise);
    expect(resCash.body.wallet_deduction.commission_paise).toBe(6000); // 10% of 60000
  });

  it('Threshold Check: Automatically flips is_available to false when balance drops below 10000 paise (₹100)', async () => {
    // Set low balance of 12000 paise (₹120)
    memDb.public.none(`
      UPDATE provider_profiles SET wallet_balance_paise = 12000, is_available = true WHERE id = '${providerProfileId}';
    `);

    // Complete ₹500 job (50000 paise) -> 10% commission = 5000 paise
    // New balance: 12000 - 5000 = 7000 paise (< 10000 min threshold)
    const { bookingId } = createTestBooking({ pricePaise: 50000 });

    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.wallet_deduction.balance_after_paise).toBe(7000);
    expect(res.body.wallet_deduction.is_available).toBe(false);
    expect(res.body.wallet_deduction.below_threshold).toBe(true);

    const profile = memDb.public.one(`SELECT * FROM provider_profiles WHERE id = '${providerProfileId}'`);
    expect(profile.wallet_balance_paise).toBe(7000);
    expect(profile.is_available).toBe(false);
  });

  it('blocks unauthorized customer from completing the booking (403 Forbidden)', async () => {
    const { bookingId } = createTestBooking({ pricePaise: 40000 });

    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${unauthorizedCustomerToken}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects attempt to complete an already completed booking (400 Bad Request)', async () => {
    const { bookingId } = createTestBooking({ pricePaise: 40000 });

    // Complete once
    await request(app)
      .post(`/api/v1/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({});

    // Attempt to complete again
    const res = await request(app)
      .post(`/api/v1/bookings/${bookingId}/complete`)
      .set('Authorization', `Bearer ${providerToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BOOKING_ALREADY_COMPLETED');
  });
});
