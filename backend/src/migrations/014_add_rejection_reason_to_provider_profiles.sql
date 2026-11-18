-- Migration 014: Add rejection_reason column to provider_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'provider_profiles' 
      AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE provider_profiles ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;
