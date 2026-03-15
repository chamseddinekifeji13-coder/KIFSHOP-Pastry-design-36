-- =============================================
-- KIFSHOP: Add shop configuration columns to tenants table
-- This enables storing address, phone, email, tax_id for each tenant
-- =============================================

-- 1. Add shop configuration columns to tenants table
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS tax_id text;

-- 2. Add comment for documentation
COMMENT ON COLUMN public.tenants.address IS 'Shop physical address';
COMMENT ON COLUMN public.tenants.phone IS 'Shop contact phone number';
COMMENT ON COLUMN public.tenants.email IS 'Shop contact email';
COMMENT ON COLUMN public.tenants.tax_id IS 'Tax identification number (Matricule fiscal)';

-- 3. Create index for potential email lookups
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email) WHERE email IS NOT NULL;
