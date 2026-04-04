-- Create table for delivery provider credentials (multi-provider support)
-- This table stores API credentials for Aramex, First Delivery, Best Delivery, etc.

CREATE TABLE IF NOT EXISTS delivery_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL, -- 'aramex', 'first_delivery', 'best_delivery'
  provider_name TEXT NOT NULL, -- Display name: 'Aramex', 'First Delivery', 'Best Delivery'
  api_key TEXT,
  api_secret TEXT,
  account_number TEXT, -- For Aramex account number
  account_pin TEXT, -- For Aramex account PIN
  username TEXT, -- Some APIs use username/password
  password TEXT,
  base_url TEXT, -- API base URL (can vary by environment)
  webhook_url TEXT, -- For receiving status updates
  extra_config JSONB DEFAULT '{}', -- Additional provider-specific config
  is_enabled BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false, -- Default provider for new orders
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, provider_code)
);

-- Create table for unified shipments (replaces best_delivery_shipments for new orders)
CREATE TABLE IF NOT EXISTS delivery_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  order_number TEXT,
  provider_code TEXT NOT NULL, -- 'aramex', 'first_delivery', 'best_delivery'
  
  -- Customer info
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT NOT NULL,
  customer_city TEXT,
  customer_governorate TEXT, -- State/Region
  customer_postal_code TEXT,
  
  -- Shipment details
  delivery_type TEXT DEFAULT 'standard', -- 'standard', 'express', 'same_day'
  tracking_number TEXT,
  provider_shipment_id TEXT, -- ID from the delivery provider
  awb_number TEXT, -- Air Waybill number (for Aramex)
  
  -- Financial
  cod_amount DECIMAL(10,3) DEFAULT 0, -- Cash on Delivery amount
  shipping_cost DECIMAL(10,3) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned', 'cancelled'
  status_history JSONB DEFAULT '[]', -- Array of {status, timestamp, notes}
  
  -- Metadata
  notes TEXT,
  exported_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  response_data JSONB, -- Raw API response
  error_message TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_delivery_provider_credentials_tenant ON delivery_provider_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_provider_credentials_code ON delivery_provider_credentials(provider_code);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_tenant ON delivery_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_order ON delivery_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_provider ON delivery_shipments(provider_code);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_status ON delivery_shipments(status);
CREATE INDEX IF NOT EXISTS idx_delivery_shipments_tracking ON delivery_shipments(tracking_number);

-- Enable RLS (Row Level Security)
ALTER TABLE delivery_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_shipments ENABLE ROW LEVEL SECURITY;

-- RLS Policy for delivery_provider_credentials
CREATE POLICY "Enable all access for authenticated users"
  ON delivery_provider_credentials FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policy for delivery_shipments
CREATE POLICY "Enable all access for authenticated users"
  ON delivery_shipments FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add cod_amount column to best_delivery_shipments if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'best_delivery_shipments' AND column_name = 'cod_amount'
  ) THEN
    ALTER TABLE best_delivery_shipments ADD COLUMN cod_amount DECIMAL(10,3) DEFAULT 0;
  END IF;
END $$;
