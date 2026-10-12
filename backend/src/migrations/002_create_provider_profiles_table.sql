-- Migration 002: Create provider_profiles table and indexes per 04_DATABASE_SCHEMA.md
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_status_enum') THEN
    CREATE TYPE kyc_status_enum AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
  kyc_status kyc_status_enum NOT NULL DEFAULT 'pending',
  kyc_document_url TEXT,
  categories TEXT[],
  service_area_radius_km INTEGER,
  base_location_lat DECIMAL(9,6),
  base_location_lng DECIMAL(9,6),
  is_available BOOLEAN DEFAULT false,
  avg_rating_honesty DECIMAL(2,1),
  avg_rating_punctuality DECIMAL(2,1),
  avg_rating_quality DECIMAL(2,1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes specified in 04_DATABASE_SCHEMA.md
CREATE INDEX IF NOT EXISTS idx_provider_profiles_kyc_status ON provider_profiles(kyc_status);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_categories ON provider_profiles USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_base_location ON provider_profiles(base_location_lat, base_location_lng);
