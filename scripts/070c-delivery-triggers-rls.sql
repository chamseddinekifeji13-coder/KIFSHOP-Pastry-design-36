-- ============================================================================
-- DELIVERY EXPORT TABLES - PART 3: TRIGGERS AND RLS
-- ============================================================================

BEGIN;

-- Trigger function for timestamp management
CREATE OR REPLACE FUNCTION update_delivery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
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
-- Row Level Security (RLS) Configuration
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE delivery_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "tenant_isolation_credentials" ON delivery_provider_credentials;
DROP POLICY IF EXISTS "tenant_isolation_shipments" ON delivery_shipments;
DROP POLICY IF EXISTS "tenant_isolation_shipment_items" ON delivery_shipment_items;
DROP POLICY IF EXISTS "tenant_isolation_export_logs" ON delivery_export_logs;
DROP POLICY IF EXISTS "tenant_isolation_webhooks" ON delivery_webhooks;
DROP POLICY IF EXISTS "tenant_isolation_rates" ON delivery_rates;

-- RLS Policy for delivery_provider_credentials
CREATE POLICY "tenant_isolation_credentials" ON delivery_provider_credentials
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- RLS Policy for delivery_shipments
CREATE POLICY "tenant_isolation_shipments" ON delivery_shipments
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- RLS Policy for delivery_shipment_items
CREATE POLICY "tenant_isolation_shipment_items" ON delivery_shipment_items
  FOR ALL USING (
    shipment_id IN (
      SELECT id FROM delivery_shipments 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

-- RLS Policy for delivery_export_logs
CREATE POLICY "tenant_isolation_export_logs" ON delivery_export_logs
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- RLS Policy for delivery_webhooks
CREATE POLICY "tenant_isolation_webhooks" ON delivery_webhooks
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    OR tenant_id IS NULL
  );

-- RLS Policy for delivery_rates
CREATE POLICY "tenant_isolation_rates" ON delivery_rates
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

COMMIT;
