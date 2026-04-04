-- Add verification fields for courier collections
-- This allows tracking when courier payments are received and verified by management

-- Add verification columns to payment_collections table
ALTER TABLE payment_collections
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_by_name TEXT;

-- Create index for faster queries on unverified courier collections
CREATE INDEX IF NOT EXISTS idx_payment_collections_courier_unverified 
ON payment_collections (tenant_id, collected_by, verified) 
WHERE collected_by = 'courier' AND verified = false;

-- Update existing direct/online collections as already verified (they don't need approval)
UPDATE payment_collections 
SET verified = true, 
    verified_at = created_at,
    verified_by_name = 'Auto-verifie (encaissement direct)'
WHERE collected_by IN ('direct', 'online') AND verified IS NULL;
