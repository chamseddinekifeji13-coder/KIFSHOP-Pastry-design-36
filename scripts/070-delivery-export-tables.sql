-- ============================================================================
-- DELIVERY EXPORT TABLES FOR API INTEGRATION
-- Simplified version without complex RLS policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Table: delivery_provider_credentials
-- ============================================================================
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

-- ============================================================================
-- 2. Table: delivery_shipments
-- ============================================================================
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

-- ============================================================================
-- 3. Table: delivery_shipment_items
-- ============================================================================
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

-- ============================================================================
-- 4. Table: delivery_export_logs
-- ============================================================================
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

-- ============================================================================
-- 5. Table: delivery_webhooks
-- ============================================================================
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

-- ============================================================================
-- 6. Table: delivery_rates
-- ============================================================================
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

-- ============================================================================
-- 7. Utility Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_tracking_reference(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_year TEXT;
  v_sequence INTEGER;
  v_reference TEXT;
BEGIN
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO v_prefix
  FROM tenants WHERE id = p_tenant_id;
  
  IF v_prefix IS NULL THEN
    v_prefix := 'KIF';
  END IF;
  
  v_year := TO_CHAR(NOW(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(tracking_number, '^[A-Z]+-[0-9]+-', ''), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM delivery_shipments
  WHERE tenant_id = p_tenant_id
  AND tracking_number LIKE v_prefix || '-' || v_year || '-%';
  
  v_reference := v_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
  
  RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_shipping_cost(
  p_tenant_id TEXT,
  p_provider_code TEXT,
  p_governorate TEXT,
  p_weight DECIMAL,
  p_cod_amount DECIMAL,
  p_delivery_type TEXT DEFAULT 'standard'
)
RETURNS DECIMAL AS $$
DECLARE
  v_rate RECORD;
  v_cost DECIMAL := 0;
  v_cod_fee DECIMAL := 0;
BEGIN
  SELECT * INTO v_rate
  FROM delivery_rates
  WHERE tenant_id = p_tenant_id
  AND provider_code = p_provider_code
  AND is_active = true
  AND p_governorate = ANY(governorates)
  LIMIT 1;
  
  IF v_rate IS NULL THEN
    RETURN 7.000;
  END IF;
  
  v_cost := v_rate.base_rate;
  
  IF p_weight > v_rate.min_weight THEN
    v_cost := v_cost + ((p_weight - v_rate.min_weight) * v_rate.rate_per_kg);
  END IF;
  
  IF p_cod_amount > 0 THEN
    v_cod_fee := GREATEST(v_rate.cod_fee, p_cod_amount * v_rate.cod_percentage / 100);
    v_cost := v_cost + v_cod_fee;
  END IF;
  
  IF p_delivery_type = 'express' THEN
    v_cost := v_cost + v_rate.express_surcharge;
  ELSIF p_delivery_type = 'same_day' THEN
    v_cost := v_cost + v_rate.same_day_surcharge;
  END IF;
  
  RETURN v_cost;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_shipment_status(
  p_shipment_id UUID,
  p_status TEXT,
  p_status_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_status TEXT;
  v_history JSONB;
BEGIN
  SELECT status, COALESCE(status_history, '[]'::jsonb)
  INTO v_current_status, v_history
  FROM delivery_shipments
  WHERE id = p_shipment_id;
  
  v_history := v_history || jsonb_build_object(
    'from_status', v_current_status,
    'to_status', p_status,
    'reason', p_status_reason,
    'timestamp', NOW()
  );
  
  UPDATE delivery_shipments
  SET 
    status = p_status,
    status_reason = p_status_reason,
    status_history = v_history,
    updated_at = NOW(),
    delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
    returned_at = CASE WHEN p_status = 'returned' THEN NOW() ELSE returned_at END
  WHERE id = p_shipment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Triggers for timestamp management
-- ============================================================================

CREATE OR REPLACE FUNCTION update_delivery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_delivery_credentials_timestamp ON delivery_provider_credentials;
CREATE TRIGGER trigger_update_delivery_credentials_timestamp
  BEFORE UPDATE ON delivery_provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_timestamp();

DROP TRIGGER IF EXISTS trigger_update_delivery_shipments_timestamp ON delivery_shipments;
CREATE TRIGGER trigger_update_delivery_shipments_timestamp
  BEFORE UPDATE ON delivery_shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_timestamp();

DROP TRIGGER IF EXISTS trigger_update_delivery_rates_timestamp ON delivery_rates;
CREATE TRIGGER trigger_update_delivery_rates_timestamp
  BEFORE UPDATE ON delivery_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_timestamp();

-- ============================================================================
-- 9. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE delivery_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_credentials" ON delivery_provider_credentials;
DROP POLICY IF EXISTS "tenant_isolation_shipments" ON delivery_shipments;
DROP POLICY IF EXISTS "tenant_isolation_shipment_items" ON delivery_shipment_items;
DROP POLICY IF EXISTS "tenant_isolation_export_logs" ON delivery_export_logs;
DROP POLICY IF EXISTS "tenant_isolation_webhooks" ON delivery_webhooks;
DROP POLICY IF EXISTS "tenant_isolation_rates" ON delivery_rates;

CREATE POLICY "tenant_isolation_credentials" ON delivery_provider_credentials
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_isolation_shipments" ON delivery_shipments
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_isolation_shipment_items" ON delivery_shipment_items
  FOR ALL USING (
    shipment_id IN (
      SELECT id FROM delivery_shipments 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "tenant_isolation_export_logs" ON delivery_export_logs
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_isolation_webhooks" ON delivery_webhooks
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    OR tenant_id IS NULL
  );

CREATE POLICY "tenant_isolation_rates" ON delivery_rates
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

COMMIT;
