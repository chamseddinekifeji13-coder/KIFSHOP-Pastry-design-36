-- =============================================
-- KIFSHOP: Add missing columns to tenants table
-- is_active and slug are referenced in code but missing from DB
-- =============================================

-- 1. Add is_active column (defaults to true for existing tenants)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Add slug column
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug text;

-- 3. Populate slug from tenant name for existing rows
UPDATE public.tenants
SET slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE slug IS NULL;

-- 4. Ensure existing tenants have trial_ends_at set if they are in trial
UPDATE public.tenants
SET trial_ends_at = now() + interval '60 days'
WHERE subscription_status = 'active'
  AND trial_ends_at IS NULL;

-- Also set trial_ends_at on subscriptions that lack it
UPDATE public.subscriptions
SET trial_ends_at = now() + interval '60 days'
WHERE status = 'trial'
  AND trial_ends_at IS NULL;
