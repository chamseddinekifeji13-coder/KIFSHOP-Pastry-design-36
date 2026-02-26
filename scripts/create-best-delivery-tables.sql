-- Create table for Best Delivery configuration
CREATE TABLE IF NOT EXISTS best_delivery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Create table for shipment history/exports
CREATE TABLE IF NOT EXISTS best_delivery_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  order_number TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT NOT NULL,
  delivery_type TEXT, -- 'standard', 'express', etc
  tracking_number TEXT,
  shipment_id TEXT, -- Best Delivery shipment ID
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'in_transit', 'delivered', 'failed'
  notes TEXT,
  exported_at TIMESTAMP DEFAULT NOW(),
  response_data JSONB, -- Store the API response
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_best_delivery_config_tenant ON best_delivery_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_best_delivery_shipments_tenant ON best_delivery_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_best_delivery_shipments_order ON best_delivery_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_best_delivery_shipments_status ON best_delivery_shipments(status);

-- Enable RLS (Row Level Security)
ALTER TABLE best_delivery_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE best_delivery_shipments ENABLE ROW LEVEL SECURITY;

-- RLS Policy for best_delivery_config
CREATE POLICY "Users can view their tenant's Best Delivery config"
  ON best_delivery_config FOR SELECT
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE id = auth.jwt() ->> 'tenant_id'
  ));

CREATE POLICY "Users can update their tenant's Best Delivery config"
  ON best_delivery_config FOR UPDATE
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE id = auth.jwt() ->> 'tenant_id'
  ));

CREATE POLICY "Users can insert their tenant's Best Delivery config"
  ON best_delivery_config FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT id FROM tenants WHERE id = auth.jwt() ->> 'tenant_id'
  ));

-- RLS Policy for best_delivery_shipments
CREATE POLICY "Users can view their tenant's shipments"
  ON best_delivery_shipments FOR SELECT
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE id = auth.jwt() ->> 'tenant_id'
  ));

CREATE POLICY "Users can insert shipments for their tenant"
  ON best_delivery_shipments FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT id FROM tenants WHERE id = auth.jwt() ->> 'tenant_id'
  ));

CREATE POLICY "Users can update their tenant's shipments"
  ON best_delivery_shipments FOR UPDATE
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE id = auth.jwt() ->> 'tenant_id'
  ));
