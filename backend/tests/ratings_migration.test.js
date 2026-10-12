const { newDb } = require('pg-mem');
const crypto = require('crypto');

describe('Module 7 - Task 1: ratings Migration & Schema Integrity', () => {
  let db;
  let customerId;
  let customer2Id;
  let providerUserId;
  let providerProfileId;
  let booking1Id;
  let booking2Id;

  beforeAll(() => {
    db = newDb();
    db.public.registerFunction({
      name: 'gen_random_uuid',
      impure: true,
      returns: db.public.getType('uuid'),
      implementation: () => crypto.randomUUID()
    });

    // Register round with 2 params if needed
    db.public.registerFunction({
      name: 'round',
      args: [db.public.getType('numeric'), db.public.getType('integer')],
      returns: db.public.getType('numeric'),
      implementation: (val, decimals) => {
        const factor = Math.pow(10, decimals);
        return Math.round(val * factor) / factor;
      }
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
        avg_rating_honesty DECIMAL,
        avg_rating_punctuality DECIMAL,
        avg_rating_quality DECIMAL
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

    // Migration 007 table creation
    db.public.none(`
      CREATE TABLE IF NOT EXISTS ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT UNIQUE,
        rating_honesty SMALLINT NOT NULL CHECK (rating_honesty BETWEEN 1 AND 5),
        rating_punctuality SMALLINT NOT NULL CHECK (rating_punctuality BETWEEN 1 AND 5),
        rating_quality SMALLINT NOT NULL CHECK (rating_quality BETWEEN 1 AND 5),
        review_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ratings_booking_id ON ratings(booking_id);
      CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);
    `);
  });

  beforeEach(() => {
    db.public.none('DELETE FROM ratings;');
    db.public.none('DELETE FROM bookings;');
    db.public.none('DELETE FROM jobs;');
    db.public.none('DELETE FROM provider_profiles;');
    db.public.none('DELETE FROM users;');

    const u1 = db.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900031', 'customer', 'Customer One')
      RETURNING id;
    `);
    customerId = u1.id;

    const u2 = db.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900032', 'customer', 'Customer Two')
      RETURNING id;
    `);
    customer2Id = u2.id;

    const pU = db.public.one(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900033', 'provider', 'Provider Master')
      RETURNING id;
    `);
    providerUserId = pU.id;

    const pP = db.public.one(`
      INSERT INTO provider_profiles (user_id)
      VALUES ('${providerUserId}')
      RETURNING id;
    `);
    providerProfileId = pP.id;

    const j1 = db.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type)
      VALUES ('${customerId}', 'plumbing', 'planned')
      RETURNING id;
    `);

    const b1 = db.public.one(`
      INSERT INTO bookings (job_id, customer_id, provider_id, status)
      VALUES ('${j1.id}', '${customerId}', '${providerProfileId}', 'completed')
      RETURNING id;
    `);
    booking1Id = b1.id;

    const j2 = db.public.one(`
      INSERT INTO jobs (customer_id, category, urgency_type)
      VALUES ('${customer2Id}', 'electrical', 'urgent')
      RETURNING id;
    `);

    const b2 = db.public.one(`
      INSERT INTO bookings (job_id, customer_id, provider_id, status)
      VALUES ('${j2.id}', '${customer2Id}', '${providerProfileId}', 'completed')
      RETURNING id;
    `);
    booking2Id = b2.id;
  });

  it('inserts and queries a 3-axis rating record', () => {
    const rating = db.public.one(`
      INSERT INTO ratings (booking_id, rating_honesty, rating_punctuality, rating_quality, review_text)
      VALUES ('${booking1Id}', 5, 4, 5, 'Excellent service, punctual and transparent!')
      RETURNING id, booking_id, rating_honesty, rating_punctuality, rating_quality, review_text;
    `);

    expect(rating.id).toBeDefined();
    expect(rating.booking_id).toBe(booking1Id);
    expect(rating.rating_honesty).toBe(5);
    expect(rating.rating_punctuality).toBe(4);
    expect(rating.rating_quality).toBe(5);
    expect(rating.review_text).toBe('Excellent service, punctual and transparent!');
  });

  it('enforces UNIQUE constraint on booking_id in ratings', () => {
    db.public.none(`
      INSERT INTO ratings (booking_id, rating_honesty, rating_punctuality, rating_quality)
      VALUES ('${booking1Id}', 5, 5, 5);
    `);

    expect(() => {
      db.public.none(`
        INSERT INTO ratings (booking_id, rating_honesty, rating_punctuality, rating_quality)
        VALUES ('${booking1Id}', 4, 4, 4);
      `);
    }).toThrow();
  });

  it('rejects ratings with scores outside 1-5 range', () => {
    expect(() => {
      db.public.none(`
        INSERT INTO ratings (booking_id, rating_honesty, rating_punctuality, rating_quality)
        VALUES ('${booking1Id}', 6, 4, 4);
      `);
    }).toThrow();

    expect(() => {
      db.public.none(`
        INSERT INTO ratings (booking_id, rating_honesty, rating_punctuality, rating_quality)
        VALUES ('${booking1Id}', 4, 0, 4);
      `);
    }).toThrow();

    expect(() => {
      db.public.none(`
        INSERT INTO ratings (booking_id, rating_honesty, rating_punctuality, rating_quality)
        VALUES ('${booking1Id}', 4, 4, -1);
      `);
    }).toThrow();
  });

  it('calculates accurate denormalized averages across multiple ratings', () => {
    // Booking 1: 5 honesty, 4 punctuality, 5 quality
    db.public.none(`
      INSERT INTO ratings (booking_id, rating_honesty, rating_punctuality, rating_quality)
      VALUES ('${booking1Id}', 5, 4, 5);
    `);

    // Booking 2: 3 honesty, 4 punctuality, 3 quality
    db.public.none(`
      INSERT INTO ratings (booking_id, rating_honesty, rating_punctuality, rating_quality)
      VALUES ('${booking2Id}', 3, 4, 3);
    `);

    const result = db.public.one(`
      SELECT 
        AVG(r.rating_honesty) as avg_honesty,
        AVG(r.rating_punctuality) as avg_punctuality,
        AVG(r.rating_quality) as avg_quality
      FROM ratings r
      JOIN bookings b ON b.id = r.booking_id
      WHERE b.provider_id = '${providerProfileId}';
    `);

    // (5 + 3) / 2 = 4.0
    expect(Number(result.avg_honesty)).toBe(4.0);
    // (4 + 4) / 2 = 4.0
    expect(Number(result.avg_punctuality)).toBe(4.0);
    // (5 + 3) / 2 = 4.0
    expect(Number(result.avg_quality)).toBe(4.0);
  });
});
