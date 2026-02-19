-- Create storage_locations table (reserves/emplacements de stockage)
CREATE TABLE IF NOT EXISTS storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  designation TEXT,
  type TEXT NOT NULL DEFAULT 'reserve' CHECK (type IN ('reserve', 'laboratoire', 'boutique', 'chambre_froide', 'autre')),
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS
ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storage_locations_tenant_policy" ON storage_locations
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- Add storage_location_id to raw_materials for default location
ALTER TABLE raw_materials ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL;

-- Add storage_location_id to finished_products for default location
ALTER TABLE finished_products ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL;

-- Add storage_location_id to packaging for default location
ALTER TABLE packaging ADD COLUMN IF NOT EXISTS storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL;

-- Add from/to location to stock_movements for transfers
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS from_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS to_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL;

-- Create stock_by_location table to track quantities per location
CREATE TABLE IF NOT EXISTS stock_by_location (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  storage_location_id UUID NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('raw_material', 'finished_product', 'packaging')),
  raw_material_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
  finished_product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
  packaging_id UUID REFERENCES packaging(id) ON DELETE CASCADE,
  quantity NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(storage_location_id, item_type, raw_material_id),
  UNIQUE(storage_location_id, item_type, finished_product_id),
  UNIQUE(storage_location_id, item_type, packaging_id)
);

ALTER TABLE stock_by_location ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_by_location_tenant_policy" ON stock_by_location
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  ));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_storage_locations_tenant ON storage_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_by_location_tenant ON stock_by_location(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_by_location_location ON stock_by_location(storage_location_id);
