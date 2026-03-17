-- Add source column to pos_sales table to distinguish between manual and POS80 entries
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';
ALTER TABLE pos_sales ADD CONSTRAINT valid_source CHECK (source IN ('manual', 'pos80', 'other'));

-- Add pos80_transaction_id column to link back to original POS80 transaction
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS pos80_transaction_id TEXT;
ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS pos80_sync_log_id BIGINT REFERENCES pos80_sync_logs(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pos_sales_source ON pos_sales(source);
CREATE INDEX IF NOT EXISTS idx_pos_sales_pos80_transaction_id ON pos_sales(pos80_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_pos80_sync_log_id ON pos_sales(pos80_sync_log_id);

-- Update existing records to mark them as 'manual'
UPDATE pos_sales SET source = 'manual' WHERE source = 'manual' OR source IS NULL;
