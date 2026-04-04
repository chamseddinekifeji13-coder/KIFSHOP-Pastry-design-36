CREATE TABLE IF NOT EXISTS delivery_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
  extra_config JSONB DEFAULT '{}',
  is_enabled BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, provider_code)
);

CREATE TABLE IF NOT EXISTS delivery_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  order_number TEXT,
  provider_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT NOT NULL,
  customer_city TEXT,
  customer_governorate TEXT,
  customer_postal_code TEXT,
  delivery_type TEXT DEFAULT 'standard',
  tracking_number TEXT,
  provider_shipment_id TEXT,
  awb_number TEXT,
  cod_amount DECIMAL(10,3) DEFAULT 0,
  shipping_cost DECIMAL(10,3) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  status_history JSONB DEFAULT '[]',
  notes TEXT,
  exported_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_provider_credentials_tenant ON delivery_provider_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_provider_credentials_code ON delivery_provider_credentials(provider_code);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_tenant ON delivery_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_order ON delivery_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_provider ON delivery_shipments(provider_code);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_status ON delivery_shipments(status);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_tracking ON delivery_shipments(tracking_number);

ALTER TABLE delivery_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_shipments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tenant_isolation_credentials" ON delivery_provider_credentials
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "tenant_isolation_shipments" ON delivery_shipments
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));
