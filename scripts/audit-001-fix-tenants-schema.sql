-- =============================================
-- AUDIT FIX 001: Corriger le schéma TENANTS
-- Problème: Référence à colonnes manquantes
-- =============================================

-- 1. Ajouter les colonnes manquantes à la table tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';

-- 2. Créer table subscriptions si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'expired', 'cancelled')),
  trial_ends_at timestamptz,
  billing_date date,
  amount numeric(10,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- 3. Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy
CREATE POLICY "subscriptions_tenant_access" ON public.subscriptions FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

-- 5. Index pour performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- 6. Corriger les defaults existants
UPDATE public.tenants
SET subscription_status = 'active'
WHERE subscription_status IS NULL;

UPDATE public.tenants
SET trial_ends_at = now() + interval '60 days'
WHERE trial_ends_at IS NULL AND created_at > now() - interval '7 days';
