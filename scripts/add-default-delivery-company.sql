-- Add default carrier and default shipping cost columns to delivery_companies table
-- This allows setting one carrier as default with a pre-filled shipping cost

-- Add is_default column (only one company can be default per tenant)
ALTER TABLE delivery_companies 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add default_shipping_cost column
ALTER TABLE delivery_companies 
ADD COLUMN IF NOT EXISTS default_shipping_cost NUMERIC(10, 3) DEFAULT 0;
