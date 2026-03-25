-- ============================================================
-- FIX PACKAGING TABLE SCHEMA
-- Problem: packaging table is missing 'type' column and has
--          'price_per_unit' instead of 'price'
-- This is the same type of fix that was done for stock
-- ============================================================

-- Add 'type' column if it doesn't exist
ALTER TABLE public.packaging
ADD COLUMN IF NOT EXISTS type text DEFAULT 'autre';

-- Add constraint for type if not already present
ALTER TABLE public.packaging
ADD CONSTRAINT packaging_type_check CHECK (type IN ('boîte', 'plateau', 'sachet', 'pot', 'film', 'papier', 'ruban', 'étiquette', 'autre'));

-- Add the new price column if it doesn't exist
ALTER TABLE public.packaging
ADD COLUMN IF NOT EXISTS price numeric(12,3) NOT NULL DEFAULT 0;

-- Copy data from price_per_unit to price
UPDATE public.packaging 
SET price = COALESCE(price_per_unit, 0) 
WHERE price = 0 AND price_per_unit IS NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_packaging_tenant_type ON public.packaging(tenant_id, type);
