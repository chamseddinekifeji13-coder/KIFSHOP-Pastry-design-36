-- ============================================================================
-- DELIVERY EXPORT TABLES - PART 1: CREATE TABLES ONLY
-- ============================================================================

BEGIN;

-- 1. delivery_provider_credentials table
CREATE TABLE IF NOT EXISTS delivery_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

-- 2. delivery_shipments table
CREATE TABLE IF NOT EXISTS delivery_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_phone_2 TEXT,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  customer_city TEXT,
  customer_governorate TEXT,
  customer_postal_code TEXT,
  customer_country TEXT DEFAULT 'TN',
  delivery_type TEXT DEFAULT 'standard',
  package_type TEXT DEFAULT 'parcel',
  total_weight DECIMAL(10,3) DEFAULT 0,
  total_pieces INTEGER DEFAULT 1,
  dimensions JSONB,
  items_description TEXT,
  special_instructions TEXT,
  cod_amount DECIMAL(10,3) DEFAULT 0,
  declared_value DECIMAL(10,3) DEFAULT 0,
  shipping_cost DECIMAL(10,3) DEFAULT 0,
  insurance_amount DECIMAL(10,3) DEFAULT 0,
  tracking_number TEXT,
  provider_shipment_id TEXT,
  awb_number TEXT,
  barcode TEXT,
  label_url TEXT,
  invoice_url TEXT,
  status TEXT DEFAULT 'pending',
  status_reason TEXT,
  status_history JSONB DEFAULT '[]',
  exported_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, order_id, provider_code)
);

CREATE INDEX IF NOT EXISTS idx_shipments_tenant ON delivery_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON delivery_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_provider ON delivery_shipments(provider_code);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON delivery_shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON delivery_shipments(tracking_number);

-- 3. delivery_shipment_items table
CREATE TABLE IF NOT EXISTS delivery_shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES delivery_shipments(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,3) DEFAULT 0,
  total_price DECIMAL(10,3) DEFAULT 0,
  weight DECIMAL(10,3) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON delivery_shipment_items(shipment_id);

-- 4. delivery_export_logs table
CREATE TABLE IF NOT EXISTS delivery_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES delivery_shipments(id) ON DELETE SET NULL,
  provider_code TEXT NOT NULL,
  operation TEXT NOT NULL,
  request_url TEXT,
  request_method TEXT,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_headers JSONB,
  response_body JSONB,
  success BOOLEAN DEFAULT false,
  error_code TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_tenant ON delivery_export_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_shipment ON delivery_export_logs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_provider ON delivery_export_logs(provider_code);

-- 5. delivery_webhooks table
CREATE TABLE IF NOT EXISTS delivery_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  tracking_number TEXT,
  shipment_id UUID REFERENCES delivery_shipments(id) ON DELETE SET NULL,
  headers JSONB,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON delivery_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_provider ON delivery_webhooks(provider_code);
CREATE INDEX IF NOT EXISTS idx_webhooks_tracking ON delivery_webhooks(tracking_number);

-- 6. delivery_rates table
CREATE TABLE IF NOT EXISTS delivery_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  governorates TEXT[],
  cities TEXT[],
  base_rate DECIMAL(10,3) NOT NULL DEFAULT 0,
  rate_per_kg DECIMAL(10,3) DEFAULT 0,
  cod_fee DECIMAL(10,3) DEFAULT 0,
  cod_percentage DECIMAL(5,2) DEFAULT 0,
  express_surcharge DECIMAL(10,3) DEFAULT 0,
  same_day_surcharge DECIMAL(10,3) DEFAULT 0,
  min_weight DECIMAL(10,3) DEFAULT 0,
  max_weight DECIMAL(10,3) DEFAULT 100,
  max_cod_amount DECIMAL(10,3) DEFAULT 10000,
  estimated_days_min INTEGER DEFAULT 1,
  estimated_days_max INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, provider_code, zone_name)
);

CREATE INDEX IF NOT EXISTS idx_rates_tenant ON delivery_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rates_provider ON delivery_rates(provider_code);

COMMIT;
