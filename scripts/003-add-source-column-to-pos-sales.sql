-- Add source column to pos_sales table to distinguish between manual and POS80 entries
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual';

-- Add constraint for source values (only if column is new)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'pos_sales' AND constraint_name = 'valid_source_pos_sales'
  ) THEN
    ALTER TABLE public.pos_sales ADD CONSTRAINT valid_source_pos_sales CHECK (source IN ('manual', 'pos80', 'other'));
  END IF;
END $$;

-- Add pos80_transaction_id column to link back to original POS80 transaction
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS pos80_transaction_id TEXT;
ALTER TABLE public.pos_sales ADD COLUMN IF NOT EXISTS pos80_sync_log_id BIGINT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pos_sales_source ON public.pos_sales(source);
CREATE INDEX IF NOT EXISTS idx_pos_sales_pos80_transaction_id ON public.pos_sales(pos80_transaction_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_pos80_sync_log_id ON public.pos_sales(pos80_sync_log_id);

-- Update existing records to mark them as 'manual'
UPDATE public.pos_sales SET source = 'manual' WHERE source IS NULL;
