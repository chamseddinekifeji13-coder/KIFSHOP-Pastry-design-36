-- =============================================
-- FIX: Add RLS policies for tenants table UPDATE
-- =============================================

-- Check if tenants table has RLS enabled
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS tenants_select_self ON public.tenants;
DROP POLICY IF EXISTS tenants_update_self ON public.tenants;
DROP POLICY IF EXISTS tenants_select ON public.tenants;
DROP POLICY IF EXISTS tenants_update ON public.tenants;

-- CREATE policies for tenants table
-- SELECT: Users can see their own tenant
CREATE POLICY tenants_select_self ON public.tenants
  FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own tenant
CREATE POLICY tenants_update_self ON public.tenants
  FOR UPDATE
  USING (
    id IN (
      SELECT DISTINCT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT DISTINCT tenant_id FROM public.tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Verify the policies are in place
COMMENT ON POLICY tenants_select_self ON public.tenants IS 'Allow users to read their own tenant';
COMMENT ON POLICY tenants_update_self ON public.tenants IS 'Allow users to update their own tenant configuration';
