-- Create delivery_provider_credentials table
CREATE TABLE IF NOT EXISTS public.delivery_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  account_number TEXT,
  account_pin TEXT,
  account_username TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, provider_code)
);

-- Create delivery_shipments table
CREATE TABLE IF NOT EXISTS public.delivery_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  tracking_number TEXT,
  tracking_url TEXT,
  status TEXT DEFAULT 'pending',
  status_updated_at TIMESTAMP WITH TIME ZONE,
  external_reference_id TEXT,
  provider_response JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, order_id, provider_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_provider_credentials_tenant ON delivery_provider_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_provider_credentials_provider ON delivery_provider_credentials(provider_code);
CREATE INDEX IF NOT EXISTS idx_delivery_provider_credentials_is_active ON delivery_provider_credentials(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_tenant ON delivery_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_order ON delivery_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_provider ON delivery_shipments(provider_code);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_status ON delivery_shipments(status);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_tracking ON delivery_shipments(tracking_number);
