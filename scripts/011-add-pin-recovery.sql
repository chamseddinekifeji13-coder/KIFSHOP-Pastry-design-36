-- Migration for PIN Recovery System
-- Adds OTP and PIN reset functionality for managers and owners

-- 1. Add PIN recovery columns to tenant_users
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS pin_reset_otp TEXT;
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS pin_reset_otp_expires_at TIMESTAMPTZ;
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS pin_reset_requested_at TIMESTAMPTZ;
ALTER TABLE public.tenant_users ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0;

-- 2. Create index for OTP cleanup queries
CREATE INDEX IF NOT EXISTS idx_tenant_users_otp_expires ON public.tenant_users(pin_reset_otp_expires_at)
WHERE pin_reset_otp IS NOT NULL;

-- 3. Function to generate random 6-digit OTP
CREATE OR REPLACE FUNCTION generate_otp()
RETURNS TEXT AS $$
BEGIN
  RETURN LPAD((FLOOR(RANDOM() * 1000000))::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. Function to initiate PIN reset (generates OTP)
CREATE OR REPLACE FUNCTION initiate_pin_reset(p_tenant_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_otp TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_otp := generate_otp();
  v_expires_at := now() + INTERVAL '15 minutes';

  UPDATE public.tenant_users
  SET
    pin_reset_otp = v_otp,
    pin_reset_otp_expires_at = v_expires_at,
    pin_reset_requested_at = now(),
    otp_attempts = 0
  WHERE id = p_tenant_user_id;

  RETURN JSON_BUILD_OBJECT('otp', v_otp, 'expires_at', v_expires_at);
END;
$$ LANGUAGE plpgsql;

-- 5. Function to verify OTP and allow PIN reset
CREATE OR REPLACE FUNCTION verify_pin_reset_otp(p_tenant_user_id UUID, p_otp TEXT)
RETURNS JSON AS $$
DECLARE
  v_stored_otp TEXT;
  v_expires_at TIMESTAMPTZ;
  v_attempts INT;
BEGIN
  SELECT pin_reset_otp, pin_reset_otp_expires_at, otp_attempts
  INTO v_stored_otp, v_expires_at, v_attempts
  FROM public.tenant_users
  WHERE id = p_tenant_user_id;

  -- Check if OTP exists and not expired
  IF v_stored_otp IS NULL THEN
    RETURN JSON_BUILD_OBJECT('success', FALSE, 'error', 'No OTP request found');
  END IF;

  IF v_expires_at < now() THEN
    UPDATE public.tenant_users
    SET pin_reset_otp = NULL, pin_reset_otp_expires_at = NULL
    WHERE id = p_tenant_user_id;
    RETURN JSON_BUILD_OBJECT('success', FALSE, 'error', 'OTP has expired');
  END IF;

  -- Check attempts (max 3 attempts)
  IF v_attempts >= 3 THEN
    RETURN JSON_BUILD_OBJECT('success', FALSE, 'error', 'Too many attempts. Please request a new OTP');
  END IF;

  -- Verify OTP
  IF v_stored_otp != p_otp THEN
    UPDATE public.tenant_users
    SET otp_attempts = otp_attempts + 1
    WHERE id = p_tenant_user_id;
    RETURN JSON_BUILD_OBJECT('success', FALSE, 'error', 'Invalid OTP', 'attemptsLeft', 3 - (v_attempts + 1));
  END IF;

  -- OTP verified - return success
  RETURN JSON_BUILD_OBJECT('success', TRUE, 'message', 'OTP verified. You can now set a new PIN');
END;
$$ LANGUAGE plpgsql;

-- 6. Function to reset PIN after OTP verification
CREATE OR REPLACE FUNCTION reset_pin_after_otp(p_tenant_user_id UUID, p_new_pin TEXT)
RETURNS JSON AS $$
DECLARE
  v_otp TEXT;
BEGIN
  SELECT pin_reset_otp
  INTO v_otp
  FROM public.tenant_users
  WHERE id = p_tenant_user_id;

  -- Check if OTP is still valid (was recently verified)
  IF v_otp IS NULL THEN
    RETURN JSON_BUILD_OBJECT('success', FALSE, 'error', 'No valid OTP session');
  END IF;

  -- Update PIN and clear OTP data
  UPDATE public.tenant_users
  SET
    pin = p_new_pin,
    pin_reset_otp = NULL,
    pin_reset_otp_expires_at = NULL,
    pin_reset_requested_at = NULL,
    otp_attempts = 0
  WHERE id = p_tenant_user_id;

  RETURN JSON_BUILD_OBJECT('success', TRUE, 'message', 'PIN has been successfully reset');
END;
$$ LANGUAGE plpgsql;
