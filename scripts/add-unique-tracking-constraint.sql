-- Add unique constraint on tracking_number per tenant to prevent duplicates
-- First, remove any existing duplicates by keeping only the most recent one

-- Create a temporary table to identify duplicates
WITH duplicates AS (
  SELECT id,
         tracking_number,
         tenant_id,
         ROW_NUMBER() OVER (
           PARTITION BY tenant_id, tracking_number 
           ORDER BY updated_at DESC NULLS LAST, created_at DESC
         ) as rn
  FROM best_delivery_shipments
  WHERE tracking_number IS NOT NULL
)
DELETE FROM best_delivery_shipments
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint on tracking_number per tenant (allowing nulls)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_tracking_number_per_tenant'
  ) THEN
    CREATE UNIQUE INDEX unique_tracking_number_per_tenant 
    ON best_delivery_shipments (tenant_id, tracking_number) 
    WHERE tracking_number IS NOT NULL;
  END IF;
END
$$;

-- Add index on customer_phone for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_shipments_customer_phone 
ON best_delivery_shipments (tenant_id, customer_phone) 
WHERE customer_phone IS NOT NULL;

-- Add index on customer_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_shipments_customer_name 
ON best_delivery_shipments (tenant_id, customer_name);
