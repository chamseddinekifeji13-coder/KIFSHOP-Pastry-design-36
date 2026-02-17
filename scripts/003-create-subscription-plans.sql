-- =============================================
-- KIFSHOP: Create subscription_plans table + seed default plans
-- =============================================

-- 1. Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  max_sales_channels integer NOT NULL DEFAULT 1,
  max_warehouses integer NOT NULL DEFAULT 1,
  max_users integer NOT NULL DEFAULT 3,
  features jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read plans (needed by tenant context)
CREATE POLICY "subscription_plans_select_all" ON public.subscription_plans
  FOR SELECT USING (true);

-- Only service_role / super admins can modify plans (handled by service_role key)

-- 3. Seed default plans
INSERT INTO public.subscription_plans (name, display_name, price_monthly, max_sales_channels, max_warehouses, max_users, features)
VALUES
  ('starter', 'Starter', 29.00, 1, 1, 3, '{"support": "email", "analytics": "basic"}'),
  ('pro', 'Professionnel', 79.00, 5, 3, 10, '{"support": "prioritaire", "analytics": "avance", "export": "csv"}'),
  ('enterprise', 'Entreprise', 199.00, 20, 10, 50, '{"support": "dedie", "analytics": "complet", "export": "csv+pdf", "api": "oui"}')
ON CONFLICT (name) DO NOTHING;
