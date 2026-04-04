-- Test: Create first delivery table
CREATE TABLE IF NOT EXISTS delivery_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  account_number TEXT,
  account_pin TEXT,
  username TEXT,
  password TEXT,
  base_url TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  extra_config JSONB DEFAULT '{}',
  default_delivery_type TEXT DEFAULT 'standard',
  default_payment_mode TEXT DEFAULT 'cod',
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_interval_minutes INTEGER DEFAULT 30,
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider_code)
);

CREATE INDEX IF NOT EXISTS idx_delivery_credentials_tenant ON delivery_provider_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_credentials_provider ON delivery_provider_credentials(provider_code);
