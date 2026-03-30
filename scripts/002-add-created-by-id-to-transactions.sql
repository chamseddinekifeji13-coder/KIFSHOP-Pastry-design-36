-- Add created_by_id column to transactions table
-- This column stores the UUID of the user who created the transaction

-- Add created_by_id column if it doesn't exist
ALTER TABLE public.transactions 
ADD COLUMN created_by_id TEXT;
