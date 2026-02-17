-- =============================================
-- KIFSHOP: Create subscriptions table (links tenants to plans)
-- =============================================

-- 1. Add missing columns to tenants for subscription tracking
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trial';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'trial',
  trial_starts_at timestamptz DEFAULT now(),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 3. Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own tenant's subscription
CREATE POLICY "subscriptions_select_own_tenant" ON public.subscriptions
  FOR SELECT USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

-- 4. Update the trigger to also create a default subscription for new tenants
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_name text;
  v_display_name text;
  v_role text;
  v_tenant_id text;
  v_trial_end timestamptz;
BEGIN
  -- Read metadata passed during signUp
  v_tenant_name := coalesce(new.raw_user_meta_data ->> 'tenant_name', 'Ma Patisserie');
  v_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'owner');
  v_trial_end := now() + interval '14 days';

  -- Generate a unique tenant ID
  v_tenant_id := 'tenant_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

  -- Create the tenant
  INSERT INTO public.tenants (id, name, slug, primary_color, subscription_plan, subscription_status, is_active, trial_ends_at)
  VALUES (
    v_tenant_id,
    v_tenant_name,
    lower(replace(v_tenant_name, ' ', '-')),
    '#4A7C59',
    'free',
    'trial',
    true,
    v_trial_end
  );

  -- Link the user to the tenant
  INSERT INTO public.tenant_users (tenant_id, user_id, role, display_name)
  VALUES (
    v_tenant_id,
    new.id,
    v_role,
    v_display_name
  );

  -- Create a default trial subscription
  INSERT INTO public.subscriptions (tenant_id, status, trial_starts_at, trial_ends_at)
  VALUES (
    v_tenant_id,
    'trial',
    now(),
    v_trial_end
  );

  RETURN new;
END;
$$;
