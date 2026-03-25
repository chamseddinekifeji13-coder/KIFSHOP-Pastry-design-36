-- ============================================================
-- FIX PACKAGING TABLE SCHEMA
-- Problem: packaging table is missing 'type' column and has
--          'price_per_unit' instead of 'price'
-- This is the same type of fix that was done for stock
-- ============================================================

-- Add 'type' column if it doesn't exist
ALTER TABLE public.packaging
ADD COLUMN IF NOT EXISTS type text DEFAULT 'autre' CHECK (type IN ('boîte', 'plateau', 'sachet', 'pot', 'film', 'papier', 'ruban', 'étiquette', 'autre'));

-- Rename price_per_unit to price for consistency with code
-- Note: We need to handle this carefully since the column might be used elsewhere
-- First, add the new price column if it doesn't exist
ALTER TABLE public.packaging
ADD COLUMN IF NOT EXISTS price numeric(12,3) NOT NULL DEFAULT 0;

-- Copy data from price_per_unit to price if price_per_unit exists
-- and price is empty (all zeros)
UPDATE public.packaging 
SET price = COALESCE(price_per_unit, 0) 
WHERE price = 0 AND price_per_unit IS NOT NULL;

-- Drop the old price_per_unit column if it exists and we've migrated the data
-- Comment this out if you want to keep it for backwards compatibility
-- ALTER TABLE public.packaging DROP COLUMN IF EXISTS price_per_unit;

-- Add min_stock if it doesn't exist (in case it's missing)
ALTER TABLE public.packaging
ADD COLUMN IF NOT EXISTS min_stock numeric(12,3) NOT NULL DEFAULT 0;

-- Add current_stock if it doesn't exist
ALTER TABLE public.packaging
ADD COLUMN IF NOT EXISTS current_stock numeric(12,3) NOT NULL DEFAULT 0;

-- Ensure storage_location_id type is correct
ALTER TABLE public.packaging
ADD COLUMN IF NOT EXISTS storage_location_id uuid;

-- Create or update index for better query performance
CREATE INDEX IF NOT EXISTS idx_packaging_tenant_type ON public.packaging(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_packaging_low_stock ON public.packaging(tenant_id) 
  WHERE current_stock < min_stock;
