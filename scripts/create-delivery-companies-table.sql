-- Create delivery_companies table
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

-- Create index on tenant_id for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_companies_tenant_id 
  ON delivery_companies(tenant_id);

-- Enable RLS
ALTER TABLE delivery_companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY delivery_companies_authenticated 
  ON delivery_companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
