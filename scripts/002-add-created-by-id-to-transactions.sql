-- Add created_by_id column to transactions table
-- This column stores the UUID of the user who created the transaction

BEGIN;

-- Add created_by_id column if it doesn't exist
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS created_by_id TEXT;

-- Create an index on created_by_id for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_by_id ON public.transactions(created_by_id);

COMMIT;
