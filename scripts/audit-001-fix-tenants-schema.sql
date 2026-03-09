-- =============================================
-- AUDIT FIX 001: Vérifier et corriger le schéma TENANTS
-- =============================================

-- Les colonnes subscription_plan, is_active, slug existent déjà
-- Juste s'assurer que tout est cohérent

-- 1. Vérifier l'existence des colonnes critiques
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Créer des indices pour les recherches
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_plan ON public.tenants(subscription_plan);

-- Le reste du schéma tenant_users est déjà correct dans le script 002
