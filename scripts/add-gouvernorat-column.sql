-- Add gouvernorat column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gouvernorat TEXT DEFAULT NULL;
