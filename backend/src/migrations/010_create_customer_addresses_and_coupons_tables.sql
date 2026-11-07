-- Migration 010: Create customer_addresses and coupons tables
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL DEFAULT 'Home', -- 'Home', 'Work', 'Other'
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  landmark VARCHAR(150),
  area VARCHAR(100) NOT NULL,
  city VARCHAR(50) NOT NULL DEFAULT 'Pune',
  pincode VARCHAR(10),
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id ON customer_addresses(user_id);

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type_enum') THEN
    CREATE TYPE discount_type_enum AS ENUM ('percentage', 'flat');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT,
  discount_type discount_type_enum NOT NULL DEFAULT 'percentage',
  discount_value INTEGER NOT NULL, -- e.g. 20 for 20% or 15000 for ₹150 flat (paise)
  min_order_paise INTEGER DEFAULT 0,
  max_discount_paise INTEGER,
  valid_until TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER DEFAULT 1000,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
