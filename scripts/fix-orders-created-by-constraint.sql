-- Fix orders_created_by_fkey constraint
-- The issue is that created_by references auth.users(id), but some employees
-- may not have a direct auth.users record (local employees with PINs).
-- This script makes the constraint allow NULL values and handles the foreign key properly.

-- Option 1: Drop and recreate the constraint to allow NULL (most compatible)
-- First, drop the existing foreign key constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_created_by_fkey;

-- Re-add the foreign key constraint with ON DELETE SET NULL
-- This allows created_by to be NULL and sets it to NULL if the referenced user is deleted
ALTER TABLE orders 
  ADD CONSTRAINT orders_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Ensure the column allows NULL values (it should by default, but just to be safe)
ALTER TABLE orders ALTER COLUMN created_by DROP NOT NULL;

-- Show result
SELECT 'orders_created_by_fkey constraint updated successfully' as result;
