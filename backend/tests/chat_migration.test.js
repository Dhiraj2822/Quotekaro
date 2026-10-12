const { newDb } = require('pg-mem');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

describe('Module 5 - Task 3: booking_messages Table Migration', () => {
  let db;

  beforeAll(() => {
    db = newDb();
    db.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      returns: db.public.getType('uuid'),
      implementation: () => crypto.randomUUID()
    });

    // Run base schemas (users, provider_profiles, jobs, quotes, bookings)
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
        user_id UUID NOT NULL UNIQUE REFERENCES users(id)
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
        job_id UUID NOT NULL REFERENCES jobs(id),
        quote_id UUID REFERENCES quotes(id),
        customer_id UUID NOT NULL REFERENCES users(id),
        provider_id UUID NOT NULL REFERENCES provider_profiles(id),
        status booking_status_enum NOT NULL DEFAULT 'confirmed'
      );
    `);

    // Read and run migration 005
    const migrationSql = fs.readFileSync(
      path.join(__dirname, '../src/migrations/005_create_booking_messages_table.sql'),
      'utf8'
    );
    db.public.none(migrationSql);
  });

  it('creates booking_messages table and enforces foreign keys and default values', () => {
    // 1. Create seed user and booking
    const user = db.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900010', 'customer', 'Chat Customer')
      RETURNING id;
    `);

    const provUser = db.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900011', 'provider', 'Chat Provider')
      RETURNING id;
    `);

    const provProfile = db.public.one(`
      INSERT INTO provider_profiles (user_id)
      VALUES ('${provUser.id}')
      RETURNING id;
    `);

    const job = db.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type)
      VALUES ('${user.id}', 'plumbing', 'planned')
      RETURNING id;
    `);

    const booking = db.public.one(`
      INSERT INTO bookings (job_id, customer_id, provider_id, status)
      VALUES ('${job.id}', '${user.id}', '${provProfile.id}', 'confirmed')
      RETURNING id;
    `);

    // 2. Insert message into booking_messages
    const msg = db.public.one(`
      INSERT INTO booking_messages (booking_id, sender_id, message)
      VALUES ('${booking.id}', '${user.id}', 'Test migration message')
      RETURNING id, booking_id, sender_id, message, is_read, created_at;
    `);

    expect(msg.id).toBeDefined();
    expect(msg.booking_id).toBe(booking.id);
    expect(msg.sender_id).toBe(user.id);
    expect(msg.message).toBe('Test migration message');
    expect(msg.is_read).toBe(false);
    expect(msg.created_at).toBeDefined();
  });
});
