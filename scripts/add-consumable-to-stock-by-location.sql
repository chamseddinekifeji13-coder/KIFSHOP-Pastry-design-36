-- 1. Add consumable_id column to stock_by_location
ALTER TABLE stock_by_location ADD COLUMN IF NOT EXISTS consumable_id UUID REFERENCES consumables(id) ON DELETE CASCADE;

-- 2. Update item_type check on stock_by_location to include 'consumable'
ALTER TABLE stock_by_location DROP CONSTRAINT IF EXISTS stock_by_location_item_type_check;
ALTER TABLE stock_by_location ADD CONSTRAINT stock_by_location_item_type_check 
  CHECK (item_type IN ('raw_material', 'finished_product', 'packaging', 'consumable'));

-- 3. Add unique constraint for consumable in stock_by_location
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stock_by_location_location_consumable_unique'
  ) THEN
    ALTER TABLE stock_by_location ADD CONSTRAINT stock_by_location_location_consumable_unique 
      UNIQUE(storage_location_id, item_type, consumable_id);
  END IF;
END $$;

-- 4. Add consumable_id column to stock_movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS consumable_id UUID REFERENCES consumables(id) ON DELETE CASCADE;

-- 5. Update item_type check on stock_movements to include 'packaging' and 'consumable'
ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_item_type_check;
ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_item_type_check 
  CHECK (item_type IN ('raw_material', 'finished_product', 'packaging', 'consumable'));
