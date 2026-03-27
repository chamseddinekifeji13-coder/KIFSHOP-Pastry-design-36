-- Add sold_by_weight column to finished_products table
-- This allows products to be sold by weight (kg) instead of by unit

ALTER TABLE finished_products 
ADD COLUMN IF NOT EXISTS sold_by_weight BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN finished_products.sold_by_weight IS 'If true, product is sold by weight (kg) with price per kg. If false, sold by unit.';
