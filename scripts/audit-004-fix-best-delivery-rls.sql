-- =============================================
-- AUDIT FIX 004: Sécuriser les tables Best Delivery
-- Problème: RLS trop permissive (expose données entre tenants)
-- =============================================

-- 1. Supprimer les anciennes politiques défaillantes
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.best_delivery_config;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.best_delivery_shipments;

-- 2. Créer les nouvelles politiques RLS pour best_delivery_config
CREATE POLICY "best_delivery_config_tenant_access" ON public.best_delivery_config FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

-- 3. Créer les nouvelles politiques RLS pour best_delivery_shipments
CREATE POLICY "best_delivery_shipments_tenant_access" ON public.best_delivery_shipments FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

-- 4. Assurer les indexes pour performance
CREATE INDEX IF NOT EXISTS idx_best_delivery_config_tenant ON public.best_delivery_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_best_delivery_shipments_tenant ON public.best_delivery_shipments(tenant_id, created_at DESC);

-- 5. Vérifier l'existence et corriger les tables support_tickets et sales_channels

-- Support Tickets RLS
DROP POLICY IF EXISTS "Enable all access" ON public.support_tickets;
DROP POLICY IF EXISTS "Enable read" ON public.support_tickets;

CREATE POLICY "support_tickets_tenant_access" ON public.support_tickets FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

-- Sales Channels RLS
DROP POLICY IF EXISTS "Users can read their own data" ON public.sales_channels;
DROP POLICY IF EXISTS "Users can create their own records" ON public.sales_channels;

CREATE POLICY "sales_channels_tenant_access" ON public.sales_channels FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

-- 6. Log des changements
INSERT INTO public.audit_log (action, table_name, description, created_at)
VALUES ('SECURITY_FIX', 'RLS_POLICIES', 'Fixed permissive RLS on multi-tenant tables', now())
ON CONFLICT DO NOTHING;
