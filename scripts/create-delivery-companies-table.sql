-- Create delivery_companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS delivery_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  contact_phone varchar(20),
  email varchar(255),
  website varchar(255),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create index on tenant_id for faster queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_delivery_companies_tenant_id 
  ON delivery_companies(tenant_id);

-- Enable RLS on delivery_companies table
ALTER TABLE delivery_companies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS delivery_companies_authenticated ON delivery_companies;
DROP POLICY IF EXISTS delivery_companies_tenant_isolation ON delivery_companies;

-- Create comprehensive RLS policy for authenticated users
-- This allows all authenticated users to view and modify any delivery company
-- (relies on application-level authorization for tenant isolation)
CREATE POLICY delivery_companies_authenticated 
  ON delivery_companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_delivery_companies_created_at 
  ON delivery_companies(created_at DESC);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_delivery_companies_is_active 
  ON delivery_companies(is_active);

