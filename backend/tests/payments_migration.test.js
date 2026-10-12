const { newDb } = require('pg-mem');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

describe('Module 6 - Task 1: payments and wallet_ledger Migration & Schema Integrity', () => {
  let db;
  let customerId;
  let providerUserId;
  let providerProfileId;
  let jobId;
  let quoteId;
  let bookingId;

  beforeAll(() => {
    db = newDb();
    db.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      returns: db.public.getType('uuid'),
      implementation: () => crypto.randomUUID()
    });

    // Base schema
    db.public.none(`
      CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number VARCHAR(15) UNIQUE NOT NULL,
        role user_role NOT NULL,
        name VARCHAR(100)
      );

      CREATE TYPE kyc_status_enum AS ENUM ('pending', 'approved', 'rejected');
      CREATE TABLE provider_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id),
        kyc_status kyc_status_enum NOT NULL DEFAULT 'approved',
        is_available BOOLEAN DEFAULT true,
        wallet_balance_paise INTEGER DEFAULT 0
      );

      CREATE TYPE urgency_type_enum AS ENUM ('urgent', 'planned');
      CREATE TYPE job_status_enum AS ENUM ('open', 'quoted', 'booked', 'in_progress', 'completed', 'cancelled');
      CREATE TABLE jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES users(id),
        category VARCHAR(30) NOT NULL,
        urgency_type urgency_type_enum NOT NULL
      );

      CREATE TYPE quote_status_enum AS ENUM ('pending', 'accepted', 'rejected');
      CREATE TABLE quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id),
        price_paise INTEGER NOT NULL
      );

      CREATE TYPE booking_status_enum AS ENUM ('confirmed', 'en_route', 'in_progress', 'completed', 'cancelled');
      CREATE TABLE bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) UNIQUE,
        quote_id UUID REFERENCES quotes(id),
        customer_id UUID NOT NULL REFERENCES users(id),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id),
        status booking_status_enum NOT NULL DEFAULT 'confirmed'
      );
    `);

    // Run migration 006
    db.public.none(`
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

      CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

      CREATE TABLE IF NOT EXISTS wallet_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE RESTRICT,
        booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
        entry_type wallet_entry_type_enum NOT NULL,
        amount_paise INTEGER NOT NULL,
        balance_after_paise INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_wallet_ledger_provider_id ON wallet_ledger(provider_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_at ON wallet_ledger(created_at);
    `);
  });

  beforeEach(() => {
    db.public.none('DELETE FROM wallet_ledger;');
    db.public.none('DELETE FROM payments;');
    db.public.none('DELETE FROM bookings;');
    db.public.none('DELETE FROM quotes;');
    db.public.none('DELETE FROM jobs;');
    db.public.none('DELETE FROM provider_profiles;');
    db.public.none('DELETE FROM users;');

    const u = db.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900021', 'customer', 'Customer One')
      RETURNING id;
    `);
    customerId = u.id;

    const pU = db.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900022', 'provider', 'Provider One')
      RETURNING id;
    `);
    providerUserId = pU.id;

    const pP = db.public.one(`
      INSERT INTO provider_profiles (user_id, wallet_balance_paise)
      VALUES ('${providerUserId}', 50000)
      RETURNING id;
    `);
    providerProfileId = pP.id;

    const j = db.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type)
      VALUES ('${customerId}', 'plumbing', 'planned')
      RETURNING id;
    `);
    jobId = j.id;

    const q = db.public.one(`
      INSERT INTO quotes (job_id, provider_id, price_paise)
      VALUES ('${jobId}', '${providerProfileId}', 40000)
      RETURNING id;
    `);
    quoteId = q.id;

    const b = db.public.one(`
      INSERT INTO bookings (job_id, quote_id, customer_id, provider_id, status)
      VALUES ('${jobId}', '${quoteId}', '${customerId}', '${providerProfileId}', 'confirmed')
      RETURNING id;
    `);
    bookingId = b.id;
  });

  it('inserts and queries digital payment record with gateway transaction ID', () => {
    const payment = db.public.one(`
      INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
      VALUES ('${bookingId}', 40000, 'upi', 'pay_test_razorpay_123', 'completed')
      RETURNING id, booking_id, amount_paise, method, gateway_txn_id, status;
    `);

    expect(payment.id).toBeDefined();
    expect(payment.booking_id).toBe(bookingId);
    expect(payment.amount_paise).toBe(40000);
    expect(payment.method).toBe('upi');
    expect(payment.gateway_txn_id).toBe('pay_test_razorpay_123');
    expect(payment.status).toBe('completed');
  });

  it('inserts and queries cash payment record (null gateway_txn_id)', () => {
    const payment = db.public.one(`
      INSERT INTO payments (booking_id, amount_paise, method, gateway_txn_id, status)
      VALUES ('${bookingId}', 40000, 'cash', NULL, 'completed')
      RETURNING id, booking_id, amount_paise, method, gateway_txn_id, status;
    `);

    expect(payment.id).toBeDefined();
    expect(payment.method).toBe('cash');
    expect(payment.gateway_txn_id).toBeNull();
    expect(payment.status).toBe('completed');
  });

  it('enforces UNIQUE constraint on booking_id in payments', () => {
    db.public.none(`
      INSERT INTO payments (booking_id, amount_paise, method, status)
      VALUES ('${bookingId}', 40000, 'cash', 'completed');
    `);

    expect(() => {
      db.public.none(`
        INSERT INTO payments (booking_id, amount_paise, method, status)
        VALUES ('${bookingId}', 40000, 'upi', 'completed');
      `);
    }).toThrow();
  });

  it('appends wallet_ledger commission deduction and topup entries', () => {
    // 1. Commission deduction (-4000 paise = 10% of 40000)
    const deduction = db.public.one(`
      INSERT INTO wallet_ledger (provider_id, booking_id, entry_type, amount_paise, balance_after_paise)
      VALUES ('${providerProfileId}', '${bookingId}', 'commission_deduction', -4000, 46000)
      RETURNING id, provider_id, booking_id, entry_type, amount_paise, balance_after_paise;
    `);

    expect(deduction.id).toBeDefined();
    expect(deduction.amount_paise).toBe(-4000);
    expect(deduction.balance_after_paise).toBe(46000);
    expect(deduction.entry_type).toBe('commission_deduction');

    // 2. Wallet topup (+20000 paise)
    const topup = db.public.one(`
      INSERT INTO wallet_ledger (provider_id, booking_id, entry_type, amount_paise, balance_after_paise)
      VALUES ('${providerProfileId}', NULL, 'topup', 20000, 66000)
      RETURNING id, provider_id, booking_id, entry_type, amount_paise, balance_after_paise;
    `);

    expect(topup.id).toBeDefined();
    expect(topup.booking_id).toBeNull();
    expect(topup.amount_paise).toBe(20000);
    expect(topup.balance_after_paise).toBe(66000);
    expect(topup.entry_type).toBe('topup');

    // 3. Verify ledger history has 2 entries ordered by creation
    const rows = db.public.many(`
      SELECT entry_type, amount_paise, balance_after_paise
      FROM wallet_ledger
      WHERE provider_id = '${providerProfileId}'
      ORDER BY created_at ASC;
    `);
    expect(rows.length).toBe(2);
    expect(rows[0].entry_type).toBe('commission_deduction');
    expect(rows[1].entry_type).toBe('topup');
  });
});
