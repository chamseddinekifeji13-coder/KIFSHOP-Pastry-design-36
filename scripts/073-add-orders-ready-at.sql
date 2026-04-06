-- Add ready_at timestamp to track when an order becomes "pret"
-- Used for "export commandes du jour" delivery workflows.

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS ready_at timestamptz;

-- Helpful index for tenant + status + day filtering in delivery exports.
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status_ready_at
ON public.orders (tenant_id, status, ready_at DESC);

-- Backfill for existing ready orders so "du jour" export can work immediately.
UPDATE public.orders
SET ready_at = COALESCE(ready_at, created_at)
WHERE status = 'pret'
  AND ready_at IS NULL;
