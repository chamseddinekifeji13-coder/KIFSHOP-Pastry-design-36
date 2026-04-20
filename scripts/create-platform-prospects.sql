-- Create platform_prospects table for super admin prospecting tool
CREATE TABLE IF NOT EXISTS platform_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  owner_name text,
  phone text,
  email text,
  city text,
  address text,
  source text NOT NULL DEFAULT 'direct',
  status text NOT NULL DEFAULT 'nouveau',
  notes text,
  next_action text,
  next_action_date timestamptz,
  demo_scheduled_at timestamptz,
  demo_contact_person text,
  converted_tenant_id uuid REFERENCES tenants(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraint for status
ALTER TABLE platform_prospects ADD CONSTRAINT platform_prospects_status_check
  CHECK (status IN ('nouveau', 'contacte', 'interesse', 'demo_planifiee', 'negociation', 'converti', 'perdu'));

-- Add check constraint for source
ALTER TABLE platform_prospects ADD CONSTRAINT platform_prospects_source_check
  CHECK (source IN ('facebook', 'instagram', 'google', 'direct', 'referral', 'salon', 'autre'));

-- Enable RLS
ALTER TABLE platform_prospects ENABLE ROW LEVEL SECURITY;

-- Only super admins (service role) can access this table
-- Restrict access explicitly to service_role requests.
CREATE POLICY "Service role full access" ON platform_prospects
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_platform_prospects_status ON platform_prospects(status);
CREATE INDEX IF NOT EXISTS idx_platform_prospects_city ON platform_prospects(city);
CREATE INDEX IF NOT EXISTS idx_platform_prospects_source ON platform_prospects(source);
CREATE INDEX IF NOT EXISTS idx_platform_prospects_next_action_date ON platform_prospects(next_action_date);
CREATE INDEX IF NOT EXISTS idx_platform_prospects_demo_scheduled_at ON platform_prospects(demo_scheduled_at);
