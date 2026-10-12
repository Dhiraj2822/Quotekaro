const { newDb } = require('pg-mem');
const crypto = require('crypto');

describe('Module 2 - Task 1: provider_profiles Table Migration', () => {
  let db;
  let testUserId;
  let testUserId2;

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

      CREATE INDEX IF NOT EXISTS idx_provider_profiles_kyc_status ON provider_profiles(kyc_status);
      CREATE INDEX IF NOT EXISTS idx_provider_profiles_base_location ON provider_profiles(base_location_lat, base_location_lng);
    `);

    const res1 = db.public.many(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900021', 'provider', 'Live Test Provider 1')
      RETURNING id;
    `);
    testUserId = res1[0].id;

    const res2 = db.public.many(`
      INSERT INTO users (phone_number, role, name)
      VALUES ('+919999900022', 'provider', 'Live Test Provider 2')
      RETURNING id;
    `);
    testUserId2 = res2[0].id;
  });

  it('allows inserting a valid provider profile with defaults (pending kyc, is_available=false)', () => {
    const res = db.public.many(`
      INSERT INTO provider_profiles (user_id, categories, service_area_radius_km, base_location_lat, base_location_lng)
      VALUES ('${testUserId}', ARRAY['electrical', 'plumbing'], 15, 18.520430, 73.856744)
      RETURNING *;
    `);

    expect(res).toHaveLength(1);
    const profile = res[0];
    expect(profile.user_id).toEqual(testUserId);
    expect(profile.kyc_status).toEqual('pending');
    expect(profile.is_available).toBe(false);
    expect(profile.categories).toEqual(['electrical', 'plumbing']);
    expect(profile.service_area_radius_km).toEqual(15);
    expect(parseFloat(profile.base_location_lat)).toBeCloseTo(18.520430);
    expect(parseFloat(profile.base_location_lng)).toBeCloseTo(73.856744);
    expect(profile.id).toBeDefined();
  });

  it('enforces UNIQUE constraint on user_id (one provider profile per user)', () => {
    expect(() => {
      db.public.none(`
        INSERT INTO provider_profiles (user_id, categories)
        VALUES ('${testUserId}', ARRAY['painting']);
      `);
    }).toThrow();
  });

  it('rejects invalid kyc_status not in enum', () => {
    expect(() => {
      db.public.none(`
        INSERT INTO provider_profiles (user_id, kyc_status)
        VALUES ('${testUserId2}', 'invalid_kyc_status');
      `);
    }).toThrow();
  });
});
