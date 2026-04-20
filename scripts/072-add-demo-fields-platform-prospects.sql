-- Add dedicated demo scheduling fields for super-admin prospecting.

ALTER TABLE public.platform_prospects
  ADD COLUMN IF NOT EXISTS demo_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS demo_contact_person text;

CREATE INDEX IF NOT EXISTS idx_platform_prospects_demo_scheduled_at
  ON public.platform_prospects(demo_scheduled_at);
