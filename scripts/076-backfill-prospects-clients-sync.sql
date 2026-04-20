-- ============================================================
-- Backfill prospects -> clients synchronization
-- - Creates missing clients from converted prospects
-- - Links historical orders to client_id
-- Safe and idempotent
-- ============================================================

BEGIN;

-- Ensure legacy schemas can store order -> client links.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);

-- Normalize converted prospects with usable phone numbers.
WITH converted_prospects AS (
  SELECT
    p.id,
    p.tenant_id,
    NULLIF(btrim(p.name), '') AS name,
    CASE
      WHEN normalized_phone LIKE '00%' THEN '+' || substr(normalized_phone, 3)
      ELSE normalized_phone
    END AS phone_norm
  FROM (
    SELECT
      id,
      tenant_id,
      name,
      regexp_replace(COALESCE(phone, ''), '[^0-9+]', '', 'g') AS normalized_phone
    FROM public.prospects
    WHERE status = 'converti'
      AND phone IS NOT NULL
      AND btrim(phone) <> ''
  ) p
  WHERE normalized_phone <> ''
),
deduped AS (
  SELECT DISTINCT ON (tenant_id, phone_norm)
    tenant_id,
    phone_norm,
    name
  FROM converted_prospects
  ORDER BY tenant_id, phone_norm, name NULLS LAST
)
INSERT INTO public.clients (
  tenant_id,
  phone,
  name,
  status,
  return_count,
  total_orders,
  total_spent,
  notes,
  created_at,
  updated_at
)
SELECT
  d.tenant_id,
  d.phone_norm,
  d.name,
  'normal',
  0,
  0,
  0,
  NULL,
  NOW(),
  NOW()
FROM deduped d
ON CONFLICT (tenant_id, phone)
DO UPDATE SET
  name = COALESCE(public.clients.name, EXCLUDED.name),
  updated_at = NOW();

-- First pass: strict link using prospects.converted_order_id when available.
WITH converted_prospects AS (
  SELECT
    p.converted_order_id AS order_id,
    p.tenant_id,
    CASE
      WHEN normalized_phone LIKE '00%' THEN '+' || substr(normalized_phone, 3)
      ELSE normalized_phone
    END AS phone_norm
  FROM (
    SELECT
      converted_order_id,
      tenant_id,
      regexp_replace(COALESCE(phone, ''), '[^0-9+]', '', 'g') AS normalized_phone
    FROM public.prospects
    WHERE status = 'converti'
      AND converted_order_id IS NOT NULL
      AND phone IS NOT NULL
      AND btrim(phone) <> ''
  ) p
  WHERE normalized_phone <> ''
)
UPDATE public.orders o
SET
  client_id = c.id,
  updated_at = NOW()
FROM converted_prospects p
JOIN public.clients c
  ON c.tenant_id = p.tenant_id
 AND c.phone = p.phone_norm
WHERE o.id = p.order_id
  AND o.tenant_id = p.tenant_id
  AND o.client_id IS NULL;

-- Second pass: fallback link for remaining orders by tenant + normalized phone.
WITH converted_prospects AS (
  SELECT DISTINCT
    p.tenant_id,
    CASE
      WHEN normalized_phone LIKE '00%' THEN '+' || substr(normalized_phone, 3)
      ELSE normalized_phone
    END AS phone_norm
  FROM (
    SELECT
      tenant_id,
      regexp_replace(COALESCE(phone, ''), '[^0-9+]', '', 'g') AS normalized_phone
    FROM public.prospects
    WHERE status = 'converti'
      AND phone IS NOT NULL
      AND btrim(phone) <> ''
  ) p
  WHERE normalized_phone <> ''
),
orders_norm AS (
  SELECT
    o.id,
    o.tenant_id,
    CASE
      WHEN normalized_phone LIKE '00%' THEN '+' || substr(normalized_phone, 3)
      ELSE normalized_phone
    END AS phone_norm
  FROM (
    SELECT
      id,
      tenant_id,
      regexp_replace(COALESCE(customer_phone, ''), '[^0-9+]', '', 'g') AS normalized_phone
    FROM public.orders
    WHERE client_id IS NULL
      AND customer_phone IS NOT NULL
      AND btrim(customer_phone) <> ''
  ) o
  WHERE normalized_phone <> ''
)
UPDATE public.orders o
SET
  client_id = c.id,
  updated_at = NOW()
FROM orders_norm onorm
JOIN converted_prospects p
  ON p.tenant_id = onorm.tenant_id
 AND p.phone_norm = onorm.phone_norm
JOIN public.clients c
  ON c.tenant_id = p.tenant_id
 AND c.phone = p.phone_norm
WHERE o.id = onorm.id
  AND o.client_id IS NULL;

COMMIT;
