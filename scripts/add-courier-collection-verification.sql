-- Add verification fields for courier collections
-- This allows tracking when courier payments are received and verified by management

-- Add verification columns to order_collections table
ALTER TABLE public.order_collections
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by TEXT,
ADD COLUMN IF NOT EXISTS verified_by_name TEXT;

-- Create index for faster queries on unverified courier collections
CREATE INDEX IF NOT EXISTS idx_order_collections_courier_unverified 
ON public.order_collections (tenant_id, collected_by, verified) 
WHERE collected_by = 'courier' AND verified = false;

-- Update existing direct/online collections as already verified (they don't need approval)
UPDATE public.order_collections 
SET verified = true, 
    verified_at = collected_at,
    verified_by_name = 'Auto-verifie (encaissement direct)'
WHERE collected_by IN ('direct', 'online', 'comptoir') AND verified = false;
