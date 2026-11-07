-- Migration 013: Add optional fields for email authentication, direct catalog bookings, OTP verification, and digital invoices
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES catalog_services(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES service_packages(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address_id UUID REFERENCES customer_addresses(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS time_slot VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_price_paise INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_paise INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_otp VARCHAR(6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completion_otp VARCHAR(6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_url TEXT;

