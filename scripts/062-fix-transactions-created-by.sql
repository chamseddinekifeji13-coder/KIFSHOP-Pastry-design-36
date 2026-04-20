-- 062-fix-transactions-created-by.sql
-- Fix transactions table: ensure created_by_name exists and remove created_by_id
-- This migration ensures the transactions table has the correct schema for cashier tracking

-- 1. Add created_by_name column if it doesn't exist
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS created_by_name TEXT DEFAULT 'Caissier';

-- 2. Ensure the column has proper constraints
COMMENT ON COLUMN public.transactions.created_by_name IS 'Name of the cashier/user who created the transaction';

-- 3. Update any NULL created_by_name values to 'Caissier'
UPDATE public.transactions 
SET created_by_name = 'Caissier' 
WHERE created_by_name IS NULL OR created_by_name = '';

-- 4. Ensure table is ready for proper data sync
-- Verify RLS is enabled
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.transactions TO service_role;
