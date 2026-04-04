-- ============================================================
-- Backfill customer_name in orders
-- Safe and idempotent: only updates rows with empty/null customer_name
-- Compatible with schemas where orders.client_id does NOT exist
-- ============================================================

BEGIN;

-- 1) Preview how many rows will be affected
--    (run this SELECT alone first if you want a dry-check)
SELECT COUNT(*) AS rows_to_update
FROM public.orders o
LEFT JOIN public.clients c
  ON c.tenant_id = o.tenant_id
 AND c.phone = o.customer_phone
WHERE (o.customer_name IS NULL OR btrim(o.customer_name) = '')
  AND c.name IS NOT NULL
  AND btrim(c.name) <> '';

-- 2) Fill missing names:
--    priority = clients.name (matched by tenant_id + customer_phone)
UPDATE public.orders o
SET
  customer_name = NULLIF(btrim(c.name), ''),
  updated_at = NOW()
FROM public.clients c
WHERE c.tenant_id = o.tenant_id
  AND c.phone = o.customer_phone
  AND (o.customer_name IS NULL OR btrim(o.customer_name) = '')
  AND c.name IS NOT NULL
  AND btrim(c.name) <> '';

-- 3) Optional: check remaining rows without names
SELECT COUNT(*) AS rows_still_missing_name
FROM public.orders o
WHERE o.customer_name IS NULL OR btrim(o.customer_name) = '';

COMMIT;
