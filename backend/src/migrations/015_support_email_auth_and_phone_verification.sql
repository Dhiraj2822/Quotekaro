-- Migration 015: Support email authentication, nullable phone during registration, and verification flags
DO $$
BEGIN
  -- Allow phone_number to be NULL initially for email-first sign-up
  ALTER TABLE users ALTER COLUMN phone_number DROP NOT NULL;

  -- Add verification flags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_phone_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_phone_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT false;
  END IF;

  -- Existing users with a phone number are already phone-verified
  UPDATE users SET is_phone_verified = true WHERE phone_number IS NOT NULL;
END $$;
