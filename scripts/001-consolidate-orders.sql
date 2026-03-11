-- MIGRATION: Consolidation des commandes (quick_orders, best_delivery_shipments → orders)
-- Cette migration unifie toutes les commandes dans la table 'orders' pour une seule source de vérité

-- 1. Créer la table order_export_history pour l'audit des importations best_delivery
CREATE TABLE IF NOT EXISTS order_export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  export_source TEXT NOT NULL DEFAULT 'best_delivery_shipments', -- Source d'origine
  external_id TEXT, -- ID externe (ex: shipment_id de best_delivery)
  external_data JSONB, -- Snapshot des données originales
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  imported_by UUID
);

CREATE INDEX IF NOT EXISTS idx_export_history_order ON order_export_history(order_id);
CREATE INDEX IF NOT EXISTS idx_export_history_tenant ON order_export_history(tenant_id);

-- 2. Migrer best_delivery_shipments → orders
-- (Les commandes best_delivery qui ne sont pas encore dans orders)
INSERT INTO orders (
  id, tenant_id, customer_name, customer_phone, customer_address, 
  total, deposit, shipping_cost, status, delivery_type, courier, 
  tracking_number, source, payment_status, delivery_date, notes,
  created_at, updated_at, estimated_delivery_at, delivered_at,
  carrier, delivery_address, return_status, gouvernorat
)
SELECT 
  gen_random_uuid(), -- Nouvel ID
  bds.tenant_id,
  bds.customer_name,
  bds.customer_phone,
  bds.customer_address,
  bds.order_total,
  bds.deposit,
  bds.shipping_cost,
  bds.status,
  bds.delivery_type,
  bds.courier,
  bds.tracking_number,
  'best_delivery' as source, -- Marquer l'origine
  CASE 
    WHEN bds.payment_status = 'paid' THEN 'paid'
    WHEN bds.payment_status = 'partial' THEN 'partial'
    ELSE 'unpaid'
  END,
  bds.delivery_date,
  bds.notes,
  bds.created_at,
  bds.updated_at,
  bds.estimated_delivery_at,
  CASE WHEN bds.status = 'delivered' THEN bds.updated_at ELSE NULL END,
  bds.carrier,
  bds.delivery_address,
  bds.return_status,
  bds.gouvernorat
WHERE NOT EXISTS (
  SELECT 1 FROM orders WHERE source = 'best_delivery' 
  AND customer_phone = bds.customer_phone
  AND orders.created_at::date = bds.created_at::date
)
ON CONFLICT (id) DO NOTHING;

-- 3. Copier les order_items de best_delivery_items → order_items 
-- Récupérer les IDs correspondants
INSERT INTO order_items (
  id, order_id, product_id, quantity, price, total, notes, created_at
)
SELECT 
  gen_random_uuid(),
  o.id, -- order_id depuis la migration ci-dessus
  bdi.product_id,
  bdi.quantity,
  bdi.price,
  bdi.total,
  bdi.notes,
  bdi.created_at
FROM best_delivery_items bdi
INNER JOIN best_delivery_shipments bds ON bdi.shipment_id = bds.id
INNER JOIN orders o ON o.source = 'best_delivery'
  AND o.customer_phone = bds.customer_phone
  AND o.created_at::date = bds.created_at::date
WHERE NOT EXISTS (
  SELECT 1 FROM order_items 
  WHERE order_id = o.id AND product_id = bdi.product_id
)
ON CONFLICT (id) DO NOTHING;

-- 4. Créer les entrées order_export_history pour traçabilité
INSERT INTO order_export_history (
  tenant_id, order_id, export_source, external_id, external_data
)
SELECT 
  bds.tenant_id,
  o.id,
  'best_delivery_shipments',
  bds.id::text,
  ROW_TO_JSON(bds.*)::jsonb
FROM best_delivery_shipments bds
INNER JOIN orders o ON o.source = 'best_delivery'
  AND o.customer_phone = bds.customer_phone
  AND o.created_at::date = bds.created_at::date
WHERE NOT EXISTS (
  SELECT 1 FROM order_export_history WHERE external_id = bds.id::text
)
ON CONFLICT DO NOTHING;

-- 5. Activer RLS pour les nouvelles tables
ALTER TABLE order_export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_export_history" ON order_export_history
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- 6. Cleanup (à faire APRÈS validation)
-- DROP TABLE IF EXISTS best_delivery_items;
-- DROP TABLE IF EXISTS best_delivery_shipments;
-- DROP TABLE IF EXISTS quick_orders;

COMMIT;
