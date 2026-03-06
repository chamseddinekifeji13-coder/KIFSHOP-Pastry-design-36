-- Add delivery tracking columns to clients table
-- This tracks successful deliveries from Best Delivery integration

-- Add delivered_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'delivered_count'
  ) THEN
    ALTER TABLE clients ADD COLUMN delivered_count INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add delivery_rate computed as percentage (optional helper column)
-- This is calculated as: delivered_count / (delivered_count + return_count) * 100
COMMENT ON COLUMN clients.delivered_count IS 'Number of successful deliveries via Best Delivery';
COMMENT ON COLUMN clients.return_count IS 'Number of returns/failed deliveries';
