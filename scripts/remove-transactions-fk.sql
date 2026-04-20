-- Remove the problematic foreign key constraint on transactions.created_by
-- This constraint prevents payment collection from working properly

BEGIN;

-- Step 1: Check if the constraint exists and drop it
DO $$ 
BEGIN
    -- Drop the foreign key constraint if it exists
    ALTER TABLE public.transactions 
    DROP CONSTRAINT IF EXISTS transactions_created_by_fkey CASCADE;
    
    -- If created_by has NOT NULL, allow NULL
    ALTER TABLE public.transactions 
    ALTER COLUMN created_by DROP NOT NULL;
    
    RAISE NOTICE 'Successfully removed transactions_created_by_fkey constraint';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error: %', SQLERRM;
END $$;

COMMIT;
