-- ============================================================
-- Backfill customer_name in orders
-- Safe and idempotent: only updates rows with empty/null customer_name
-- ============================================================

BEGIN;

-- 1) Preview how many rows will be affected
--    (run this SELECT alone first if you want a dry-check)
SELECT COUNT(*) AS rows_to_update
FROM public.orders o
LEFT JOIN public.clients c
  ON c.id = o.client_id
WHERE (o.customer_name IS NULL OR btrim(o.customer_name) = '')
  AND (
    (c.name IS NOT NULL AND btrim(c.name) <> '')
    OR (o.client_name IS NOT NULL AND btrim(o.client_name) <> '')
  );

-- 2) Fill missing names:
--    priority = clients.name -> orders.client_name
UPDATE public.orders o
SET
  customer_name = COALESCE(NULLIF(btrim(c.name), ''), NULLIF(btrim(o.client_name), '')),
  updated_at = NOW()
FROM public.clients c
WHERE c.id = o.client_id
  AND (o.customer_name IS NULL OR btrim(o.customer_name) = '')
  AND COALESCE(NULLIF(btrim(c.name), ''), NULLIF(btrim(o.client_name), '')) IS NOT NULL;

-- 3) Optional: check remaining rows without names
SELECT COUNT(*) AS rows_still_missing_name
FROM public.orders o
WHERE o.customer_name IS NULL OR btrim(o.customer_name) = '';

COMMIT;
