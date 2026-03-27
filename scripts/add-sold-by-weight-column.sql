-- Add sold_by_weight column to finished_products table
-- This allows products to be sold by weight (kg) instead of by unit

BEGIN;

ALTER TABLE public.finished_products 
ADD COLUMN IF NOT EXISTS sold_by_weight BOOLEAN DEFAULT FALSE;

COMMIT;
