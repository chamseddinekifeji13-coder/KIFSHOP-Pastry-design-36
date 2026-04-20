-- Add packed_by column to orders table
-- This column tracks which packer (emballeur) is handling the order,
-- separate from the courier field which tracks the delivery company.
-- Previously, the courier field was overwritten by the packer's name,
-- which caused the packer view to show 0 orders when courier was already
-- set to a delivery company at order creation.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS packed_by TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_packed_by ON public.orders(packed_by);
