-- =============================================
-- KIFSHOP: Create tenant_invites table + create_tenant_invite RPC
-- =============================================

-- 1. Create tenant_invites table
CREATE TABLE IF NOT EXISTS public.tenant_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  tenant_name text NOT NULL,
  email text NOT NULL,
  city text,
  trial_days integer NOT NULL DEFAULT 14,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_by uuid REFERENCES auth.users(id),
  accepted_by uuid REFERENCES auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invites_token ON public.tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_email ON public.tenant_invites(email);
CREATE INDEX IF NOT EXISTS idx_tenant_invites_status ON public.tenant_invites(status);

-- 2. Enable RLS
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

-- Super admins (service_role) can do everything; regular users can read pending invites by token
CREATE POLICY "tenant_invites_select_by_token" ON public.tenant_invites
  FOR SELECT USING (true);

CREATE POLICY "tenant_invites_insert_service" ON public.tenant_invites
  FOR INSERT WITH CHECK (true);

CREATE POLICY "tenant_invites_update_service" ON public.tenant_invites
  FOR UPDATE USING (true);

-- 3. RPC: create_tenant_invite
--    Called by super-admin to generate a new invite and return the record
CREATE OR REPLACE FUNCTION public.create_tenant_invite(
  p_name text,
  p_email text,
  p_city text DEFAULT NULL,
  p_trial_days integer DEFAULT 14
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite tenant_invites;
  v_caller_id uuid;
BEGIN
  -- Get the caller's user id
  v_caller_id := auth.uid();

  -- Insert the invite
  INSERT INTO public.tenant_invites (tenant_name, email, city, trial_days, created_by, expires_at)
  VALUES (
    p_name,
    p_email,
    p_city,
    p_trial_days,
    v_caller_id,
    now() + (p_trial_days || ' days')::interval
  )
  RETURNING * INTO v_invite;

  RETURN jsonb_build_object(
    'id', v_invite.id,
    'token', v_invite.token,
    'tenant_name', v_invite.tenant_name,
    'email', v_invite.email,
    'city', v_invite.city,
    'trial_days', v_invite.trial_days,
    'status', v_invite.status,
    'expires_at', v_invite.expires_at,
    'created_at', v_invite.created_at
  );
END;
$$;
