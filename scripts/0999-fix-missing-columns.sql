-- Simple migration to add missing columns to raw_materials table
-- These columns are referenced in the TypeScript code but were missing from the schema

ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE public.raw_materials ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Create indexes for barcode lookups
CREATE INDEX IF NOT EXISTS idx_raw_materials_barcode ON public.raw_materials(barcode);
