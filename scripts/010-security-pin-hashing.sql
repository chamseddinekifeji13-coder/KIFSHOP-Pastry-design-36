-- Migration for PIN security hardening
-- Adds pgcrypto extension for bcrypt-style hashing

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add pin_hash column for storing bcrypt-hashed PINs
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Add note column to track migration status
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS pin_migrated BOOLEAN DEFAULT false;

-- Create index on pin_migrated for cleanup queries
CREATE INDEX IF NOT EXISTS idx_tenant_users_pin_migrated ON tenant_users(pin_migrated) WHERE pin_migrated = false;

-- Function to check hashed PIN (to be used in verify-pin API)
CREATE OR REPLACE FUNCTION verify_pin_hash(stored_hash TEXT, input_pin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN stored_hash = crypt(input_pin, stored_hash);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Note: Existing plain-text PINs in the 'pin' column will need to be:
-- 1. Hashed using bcrypt (e.g., bcryptjs in Node.js)
-- 2. Stored in 'pin_hash'
-- 3. Marked as migrated
-- 4. Original 'pin' column can then be dropped after verification
