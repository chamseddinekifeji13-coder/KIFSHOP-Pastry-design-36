-- Migration for PIN Recovery System
-- Adds OTP and PIN reset functionality for managers and owners

-- 1. Add PIN recovery columns to tenant_users
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS pin_reset_otp TEXT;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS pin_reset_otp_expires_at TIMESTAMPTZ;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS pin_reset_requested_at TIMESTAMPTZ;
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0;

-- 2. Create index for OTP cleanup queries
CREATE INDEX IF NOT EXISTS idx_tenant_users_otp_expires ON tenant_users(pin_reset_otp_expires_at)
WHERE pin_reset_otp IS NOT NULL;
