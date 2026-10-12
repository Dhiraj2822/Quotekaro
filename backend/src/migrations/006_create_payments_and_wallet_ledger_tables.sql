-- Migration 006: Create payments and wallet_ledger tables per 04_DATABASE_SCHEMA.md & 07_SECURITY.md §3

-- Payment Enums
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
    CREATE TYPE payment_method_enum AS ENUM ('upi', 'card', 'cash');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE payment_status_enum AS ENUM ('pending', 'completed', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_entry_type_enum') THEN
    CREATE TYPE wallet_entry_type_enum AS ENUM ('commission_deduction', 'topup', 'payout');
  END IF;
END $$;

-- payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT UNIQUE,
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  method payment_method_enum NOT NULL,
  gateway_txn_id VARCHAR(100),
  status payment_status_enum NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- wallet_ledger Table (append-only audit log)
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  entry_type wallet_entry_type_enum NOT NULL,
  amount_paise INTEGER NOT NULL,
  balance_after_paise INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_provider_id ON wallet_ledger(provider_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_created_at ON wallet_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_provider_created ON wallet_ledger(provider_id, created_at DESC);

-- Optional wallet_balance_paise on provider_profiles if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'provider_profiles' AND column_name = 'wallet_balance_paise'
  ) THEN
    ALTER TABLE provider_profiles ADD COLUMN wallet_balance_paise INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Enforce append-only security rule on wallet_ledger per 07_SECURITY.md §3
CREATE OR REPLACE FUNCTION prevent_wallet_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'wallet_ledger is append-only per 07_SECURITY.md §3. Updates and deletions are strictly prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_wallet_ledger_append_only ON wallet_ledger;
CREATE TRIGGER trg_wallet_ledger_append_only
BEFORE UPDATE OR DELETE ON wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION prevent_wallet_ledger_modification();
