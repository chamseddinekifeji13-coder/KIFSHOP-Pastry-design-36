-- Add created_by_id column to transactions table
-- This fixes the schema cache mismatch in Supabase

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS created_by_id TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_created_by_id ON public.transactions(created_by_id);

COMMENT ON COLUMN public.transactions.created_by_id IS 'UUID of user who created this transaction';
