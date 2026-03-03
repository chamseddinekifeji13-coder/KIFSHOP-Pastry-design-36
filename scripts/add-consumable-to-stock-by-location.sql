-- Add consumable_id column to stock_by_location if not already present
ALTER TABLE stock_by_location ADD COLUMN IF NOT EXISTS consumable_id UUID REFERENCES consumables(id) ON DELETE CASCADE;

-- Drop the existing item_type check constraint and recreate with consumable included
ALTER TABLE stock_by_location DROP CONSTRAINT IF EXISTS stock_by_location_item_type_check;
ALTER TABLE stock_by_location ADD CONSTRAINT stock_by_location_item_type_check 
  CHECK (item_type IN ('raw_material', 'finished_product', 'packaging', 'consumable'));

-- Add unique constraint for consumable (prevents duplicate rows per location+consumable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_by_location_location_consumable_unique'
  ) THEN
    ALTER TABLE stock_by_location ADD CONSTRAINT stock_by_location_location_consumable_unique 
      UNIQUE(storage_location_id, item_type, consumable_id);
  END IF;
END $$;
