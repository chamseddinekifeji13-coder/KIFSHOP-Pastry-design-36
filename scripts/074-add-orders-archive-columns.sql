-- Soft archive for completed/cancelled orders to keep orders pages fast.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS archived_at timestamptz;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS archived_reason text;

CREATE INDEX IF NOT EXISTS idx_orders_tenant_archived_status
ON public.orders (tenant_id, is_archived, status, updated_at DESC);

