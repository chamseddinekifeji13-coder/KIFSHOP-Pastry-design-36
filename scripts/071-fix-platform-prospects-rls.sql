-- Harden platform_prospects access:
-- ensure only service_role can read/write this platform-level table.

ALTER TABLE public.platform_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.platform_prospects;

CREATE POLICY "Service role full access" ON public.platform_prospects
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
