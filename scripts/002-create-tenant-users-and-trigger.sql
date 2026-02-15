-- =============================================
-- KIFSHOP: Create tenant_users table + auto-provision trigger
-- =============================================

-- 1. Add missing columns to tenants if they don't exist
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. Create tenant_users table (the app uses this, not profiles)
CREATE TABLE IF NOT EXISTS public.tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'vendeur',
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);

-- 3. Enable RLS on tenant_users
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- Users can see members of their own tenant
CREATE POLICY "tenant_users_select_own_tenant" ON public.tenant_users
  FOR SELECT USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

-- Users can update their own record
CREATE POLICY "tenant_users_update_own" ON public.tenant_users
  FOR UPDATE USING (user_id = auth.uid());

-- Owners can insert new users for their tenant
CREATE POLICY "tenant_users_insert_owner" ON public.tenant_users
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu 
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'gerant')
    )
  );

-- Owners can delete users from their tenant
CREATE POLICY "tenant_users_delete_owner" ON public.tenant_users
  FOR DELETE USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu 
      WHERE tu.user_id = auth.uid() AND tu.role IN ('owner', 'gerant')
    )
  );

-- 4. Create trigger function that auto-provisions tenant + tenant_users on signup
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
BEGIN
  -- Read metadata passed during signUp
  v_tenant_name := coalesce(new.raw_user_meta_data ->> 'tenant_name', 'Ma Patisserie');
  v_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'owner');

  -- Generate a unique tenant ID
  v_tenant_id := 'tenant_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

  -- Create the tenant
  INSERT INTO public.tenants (id, name, slug, primary_color, subscription_plan, is_active)
  VALUES (
    v_tenant_id,
    v_tenant_name,
    lower(replace(v_tenant_name, ' ', '-')),
    '#4A7C59',
    'free',
    true
  );

  -- Link the user to the tenant
  INSERT INTO public.tenant_users (tenant_id, user_id, role, display_name)
  VALUES (
    v_tenant_id,
    new.id,
    v_role,
    v_display_name
  );

  RETURN new;
END;
$$;

-- 5. Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
