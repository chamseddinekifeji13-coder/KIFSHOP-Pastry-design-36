-- Add default delivery company columns
-- This script adds support for setting a default delivery company and shipping cost

BEGIN;

-- Add is_default column if it doesn't exist
ALTER TABLE delivery_companies
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- Add default_shipping_cost column if it doesn't exist
ALTER TABLE delivery_companies
ADD COLUMN IF NOT EXISTS default_shipping_cost numeric(10, 3) DEFAULT 0;

-- Create a partial unique index to ensure only one default per tenant
-- Drop if exists first
DROP INDEX IF EXISTS idx_delivery_companies_default_per_tenant;

CREATE UNIQUE INDEX idx_delivery_companies_default_per_tenant 
ON delivery_companies(tenant_id) 
WHERE is_default = true;

COMMIT;
