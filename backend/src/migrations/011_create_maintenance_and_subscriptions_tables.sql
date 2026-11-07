-- Migration 011: Create appliance registry, AI maintenance recommendations, and subscription tables
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier_enum') THEN
    CREATE TYPE subscription_tier_enum AS ENUM ('basic', 'standard', 'premium');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status_enum') THEN
    CREATE TYPE subscription_status_enum AS ENUM ('active', 'cancelled', 'expired', 'trial');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_priority_enum') THEN
    CREATE TYPE recommendation_priority_enum AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS appliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_name VARCHAR(100) DEFAULT 'Main Residence',
  appliance_type VARCHAR(50) NOT NULL, -- 'ac', 'refrigerator', 'washing_machine', 'water_purifier', 'microwave', 'geyser', 'chimney', 'television', 'dishwasher', 'other'
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  purchase_date DATE,
  installation_date DATE,
  warranty_expiry_date DATE,
  last_service_date DATE,
  usage_frequency VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'heavy'
  repair_history JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  health_score INTEGER DEFAULT 90, -- 0-100 health score
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appliances_user_id ON appliances(user_id);
CREATE INDEX IF NOT EXISTS idx_appliances_type ON appliances(appliance_type);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  tier subscription_tier_enum NOT NULL,
  monthly_price_paise INTEGER NOT NULL, -- e.g. 19900 (₹199), 49900 (₹499), 99900 (₹999)
  annual_price_paise INTEGER NOT NULL,  -- e.g. 199900 (₹1,999), 499900 (₹4,999), 999900 (₹9,999)
  features TEXT[],
  maintenance_visits_per_year INTEGER DEFAULT 2,
  priority_support BOOLEAN DEFAULT false,
  service_discount_percent INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'annual'
  status subscription_status_enum NOT NULL DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_renewal_date TIMESTAMP WITH TIME ZONE,
  visits_total INTEGER DEFAULT 2,
  visits_remaining INTEGER DEFAULT 2,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_user_id ON customer_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_subscriptions_status ON customer_subscriptions(status);

CREATE TABLE IF NOT EXISTS maintenance_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appliance_id UUID NOT NULL REFERENCES appliances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recommended_date DATE NOT NULL,
  priority recommendation_priority_enum NOT NULL DEFAULT 'medium',
  suggested_service VARCHAR(150) NOT NULL,
  estimated_price_range VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'scheduled', 'completed', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON maintenance_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_appliance_id ON maintenance_recommendations(appliance_id);

