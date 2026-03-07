-- Remove duplicate shipments, keeping only the most recent one
-- This handles duplicates based on tracking_number per tenant

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
    AND tracking_number != ''
)
DELETE FROM best_delivery_shipments
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Create indexes for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_shipments_tracking 
ON best_delivery_shipments (tenant_id, tracking_number) 
WHERE tracking_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_phone_name 
ON best_delivery_shipments (tenant_id, customer_phone, customer_name) 
WHERE customer_phone IS NOT NULL;
