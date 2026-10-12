-- Migration 003: Create jobs table and indexes per 04_DATABASE_SCHEMA.md
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgency_type_enum') THEN
    CREATE TYPE urgency_type_enum AS ENUM ('urgent', 'planned');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status_enum') THEN
    CREATE TYPE job_status_enum AS ENUM ('open', 'quoted', 'booked', 'in_progress', 'completed', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(30) NOT NULL,
  urgency_type urgency_type_enum NOT NULL,
  description TEXT,
  photo_urls TEXT[],
  area VARCHAR(100),
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  status job_status_enum NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes specified in 04_DATABASE_SCHEMA.md
CREATE INDEX IF NOT EXISTS idx_jobs_category_area_status ON jobs(category, area, status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON jobs(lat, lng);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
