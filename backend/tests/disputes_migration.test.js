const { newDb } = require('pg-mem');
const crypto = require('crypto');

describe('Module 8 - Task 1: disputes Migration & Schema Integrity', () => {
  let db;
  let customerId;
  let providerUserId;
  let providerProfileId;
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
        is_available BOOLEAN DEFAULT true
      );

      CREATE TYPE urgency_type_enum AS ENUM ('urgent', 'planned');
      CREATE TYPE job_status_enum AS ENUM ('open', 'quoted', 'booked', 'in_progress', 'completed', 'cancelled');
      CREATE TABLE jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES users(id),
        category VARCHAR(30) NOT NULL,
        urgency_type urgency_type_enum NOT NULL
      );

      CREATE TYPE booking_status_enum AS ENUM ('confirmed', 'en_route', 'in_progress', 'completed', 'cancelled');
      CREATE TABLE bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) UNIQUE,
        customer_id UUID NOT NULL REFERENCES users(id),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id),
        status booking_status_enum NOT NULL DEFAULT 'completed'
      );
    `);

    // Migration 008
    db.public.none(`
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

      CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON disputes(booking_id);
      CREATE INDEX IF NOT EXISTS idx_disputes_raised_by ON disputes(raised_by);
      CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
      CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes(created_at);
    `);
  });

  beforeEach(() => {
    db.public.none('DELETE FROM disputes;');
    db.public.none('DELETE FROM bookings;');
    db.public.none('DELETE FROM jobs;');
    db.public.none('DELETE FROM provider_profiles;');
    db.public.none('DELETE FROM users;');

    const u = db.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900081', 'customer', 'Dispute Customer')
      RETURNING id;
    `);
    customerId = u.id;

    const pU = db.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900082', 'provider', 'Dispute Provider')
      RETURNING id;
    `);
    providerUserId = pU.id;

    const pP = db.public.one(`
      INSERT INTO provider_profiles (user_id)
      VALUES ('${providerUserId}')
      RETURNING id;
    `);
    providerProfileId = pP.id;

    const j = db.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type)
      VALUES ('${customerId}', 'plumbing', 'planned')
      RETURNING id;
    `);

    const b = db.public.one(`
      INSERT INTO bookings (job_id, customer_id, provider_id, status)
      VALUES ('${j.id}', '${customerId}', '${providerProfileId}', 'completed')
      RETURNING id;
    `);
    bookingId = b.id;
  });

  it('inserts and queries a dispute with default status "open"', () => {
    const dispute = db.public.one(`
      INSERT INTO disputes (booking_id, raised_by, reason)
      VALUES ('${bookingId}', '${customerId}', 'Provider left debris and did not replace washer.')
      RETURNING id, booking_id, raised_by, reason, status, resolution_notes;
    `);

    expect(dispute.id).toBeDefined();
    expect(dispute.booking_id).toBe(bookingId);
    expect(dispute.raised_by).toBe(customerId);
    expect(dispute.reason).toBe('Provider left debris and did not replace washer.');
    expect(dispute.status).toBe('open');
    expect(dispute.resolution_notes).toBeNull();
  });

  it('updates dispute status through "under_review" to "resolved" with resolution notes', () => {
    const inserted = db.public.one(`
      INSERT INTO disputes (booking_id, raised_by, reason)
      VALUES ('${bookingId}', '${customerId}', 'Billing discrepancy')
      RETURNING id;
    `);

    // Move to under_review
    db.public.none(`
      UPDATE disputes
      SET status = 'under_review', updated_at = NOW()
      WHERE id = '${inserted.id}';
    `);

    let dispute = db.public.one(`SELECT status FROM disputes WHERE id = '${inserted.id}';`);
    expect(dispute.status).toBe('under_review');

    // Resolve dispute with admin resolution notes
    db.public.none(`
      UPDATE disputes
      SET status = 'resolved', resolution_notes = 'Reconciled invoice and issued partial credit to customer.', updated_at = NOW()
      WHERE id = '${inserted.id}';
    `);

    dispute = db.public.one(`SELECT status, resolution_notes FROM disputes WHERE id = '${inserted.id}';`);
    expect(dispute.status).toBe('resolved');
    expect(dispute.resolution_notes).toBe('Reconciled invoice and issued partial credit to customer.');
  });

  it('rejects invalid dispute status not in enum', () => {
    expect(() => {
      db.public.none(`
        INSERT INTO disputes (booking_id, raised_by, reason, status)
        VALUES ('${bookingId}', '${customerId}', 'Test reason', 'invalid_status');
      `);
    }).toThrow();
  });
});
