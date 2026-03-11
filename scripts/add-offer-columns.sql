-- Migration: Add offer columns to orders table
-- This allows tracking of gifted/promotional orders for clients or staff

-- Add order_type column (normal, offre_client, offre_personnel)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'normal';

-- Add offer_beneficiary column (name of the person receiving the offer)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS offer_beneficiary TEXT;

-- Add offer_reason column (reason for the offer: loyalty, anniversary, promo, etc.)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS offer_reason TEXT;

-- Add discount_percent column (0-100, 100 = fully gifted)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) DEFAULT 0;

-- Create index for filtering by order_type
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

-- Update RLS policy to allow reading offer columns (if RLS is enabled)
-- The existing policies should already cover this since we're adding columns to an existing table
