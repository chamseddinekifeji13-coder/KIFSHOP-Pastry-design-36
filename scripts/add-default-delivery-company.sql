-- Add default carrier and default shipping cost columns to delivery_companies table
-- This allows setting one carrier as default with a pre-filled shipping cost

-- Add is_default column (only one company can be default per tenant)
ALTER TABLE delivery_companies 
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- Add default_shipping_cost column
ALTER TABLE delivery_companies 
ADD COLUMN IF NOT EXISTS default_shipping_cost NUMERIC(10, 3) DEFAULT 0;

-- Create a function to ensure only one default per tenant
CREATE OR REPLACE FUNCTION ensure_single_default_delivery_company()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this company as default, unset all others for the same tenant
  IF NEW.is_default = true THEN
    UPDATE delivery_companies 
    SET is_default = false 
    WHERE tenant_id = NEW.tenant_id 
      AND id != NEW.id 
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_single_default_delivery_company ON delivery_companies;

CREATE TRIGGER trg_single_default_delivery_company
BEFORE INSERT OR UPDATE ON delivery_companies
FOR EACH ROW
EXECUTE FUNCTION ensure_single_default_delivery_company();

-- Add comment for documentation
COMMENT ON COLUMN delivery_companies.is_default IS 'Whether this is the default delivery company for the tenant (only one per tenant)';
COMMENT ON COLUMN delivery_companies.default_shipping_cost IS 'Default shipping cost to pre-fill when this company is selected';
