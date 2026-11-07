-- Migration 009: Create categories, services, packages, and addons tables for Urban Company style catalog
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50) NOT NULL,
  image_url TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_categories_slug ON service_categories(slug);
CREATE INDEX IF NOT EXISTS idx_service_categories_is_active ON service_categories(is_active);

CREATE TABLE IF NOT EXISTS catalog_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  base_price_paise INTEGER NOT NULL DEFAULT 0,
  estimated_duration_min INTEGER DEFAULT 60,
  image_url TEXT,
  rating DECIMAL(2,1) DEFAULT 4.8,
  review_count INTEGER DEFAULT 120,
  is_popular BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  inclusions TEXT[],
  exclusions TEXT[],
  faqs JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_services_category_id ON catalog_services(category_id);
CREATE INDEX IF NOT EXISTS idx_catalog_services_slug ON catalog_services(slug);
CREATE INDEX IF NOT EXISTS idx_catalog_services_is_active ON catalog_services(is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_services_popular ON catalog_services(is_popular);

CREATE TABLE IF NOT EXISTS service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES catalog_services(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  price_paise INTEGER NOT NULL,
  estimated_duration_min INTEGER DEFAULT 60,
  is_default BOOLEAN DEFAULT false,
  features TEXT[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_packages_service_id ON service_packages(service_id);

CREATE TABLE IF NOT EXISTS service_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES catalog_services(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  price_paise INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_addons_service_id ON service_addons(service_id);
