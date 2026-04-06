-- Add archived field to orders table for soft delete functionality
-- This allows hiding exported/processed orders from the main view while keeping data for history

ALTER TABLE orders ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Create index on archived column for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(archived);

-- Create index on status + archived for common filters
CREATE INDEX IF NOT EXISTS idx_orders_status_archived ON orders(status, archived);
