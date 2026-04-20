-- =============================================================================
-- Tables workflow approvisionnement (tenant_id TEXT, aligné sur tenants.id)
-- À exécuter dans Supabase → SQL Editor si l'erreur suivante apparaît :
--   "Could not find the table 'public.bon_approvisionnement' in the schema cache"
-- Idempotent : CREATE IF NOT EXISTS + politiques RLS si la table vient d'être créée.
-- =============================================================================

-- Stock alerts (optionnel mais utilisé par la RPC / traçabilité si vous migrez)
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  raw_material_id uuid,
  item_type text NOT NULL CHECK (item_type IN ('raw_material', 'packaging', 'consumable')),
  item_name text NOT NULL,
  item_unit text NOT NULL,
  current_stock numeric(12,3) NOT NULL,
  min_stock numeric(12,3) NOT NULL,
  suggested_quantity numeric(12,3) NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'ignored', 'resolved')),
  preferred_supplier_id uuid,
  preferred_supplier_name text,
  estimated_unit_price numeric(12,3),
  converted_to_appro_id uuid,
  converted_at timestamptz,
  converted_by uuid,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_tenant ON public.stock_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON public.stock_alerts(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.bon_approvisionnement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'sent_to_suppliers', 'partially_ordered', 'fully_ordered', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes text,
  total_items integer NOT NULL DEFAULT 0,
  estimated_total numeric(12,3) NOT NULL DEFAULT 0,
  created_by uuid,
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, reference)
);

CREATE INDEX IF NOT EXISTS idx_bon_approvisionnement_tenant ON public.bon_approvisionnement(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bon_approvisionnement_status ON public.bon_approvisionnement(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.bon_approvisionnement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_appro_id uuid NOT NULL REFERENCES public.bon_approvisionnement(id) ON DELETE CASCADE,
  stock_alert_id uuid REFERENCES public.stock_alerts(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('raw_material', 'packaging', 'consumable')),
  raw_material_id uuid,
  item_name text NOT NULL,
  item_unit text NOT NULL,
  requested_quantity numeric(12,3) NOT NULL,
  validated_quantity numeric(12,3),
  estimated_unit_price numeric(12,3),
  estimated_total numeric(12,3),
  assigned_supplier_id uuid,
  assigned_supplier_name text,
  purchase_order_id uuid,
  ordered_quantity numeric(12,3),
  ordered_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'ordered', 'received', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bon_appro_items_bon ON public.bon_approvisionnement_items(bon_appro_id);

CREATE TABLE IF NOT EXISTS public.workflow_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('stock_alert', 'bon_approvisionnement', 'purchase_order')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'validated', 'cancelled', 'converted', 'sent_to_supplier', 'ordered', 'received')),
  old_status text,
  new_status text,
  details jsonb,
  related_alert_id uuid,
  related_appro_id uuid,
  related_order_id uuid,
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_audit_tenant ON public.workflow_audit_log(tenant_id, performed_at DESC);

-- RLS (accès par tenant via tenant_users)
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bon_approvisionnement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bon_approvisionnement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stock_alerts' AND policyname = 'stock_alerts_tenant_access'
  ) THEN
    CREATE POLICY "stock_alerts_tenant_access" ON public.stock_alerts FOR ALL
      USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bon_approvisionnement' AND policyname = 'bon_approvisionnement_tenant_access'
  ) THEN
    CREATE POLICY "bon_approvisionnement_tenant_access" ON public.bon_approvisionnement FOR ALL
      USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bon_approvisionnement_items' AND policyname = 'bon_approvisionnement_items_tenant_access'
  ) THEN
    CREATE POLICY "bon_approvisionnement_items_tenant_access" ON public.bon_approvisionnement_items FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.bon_approvisionnement b
          WHERE b.id = bon_approvisionnement_items.bon_appro_id
            AND b.tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workflow_audit_log' AND policyname = 'workflow_audit_log_tenant_access'
  ) THEN
    CREATE POLICY "workflow_audit_log_tenant_access" ON public.workflow_audit_log FOR ALL
      USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));
  END IF;
END $$;

-- Realtime : activer dans Supabase → Database → Replication si besoin (évite erreurs si déjà ajouté).
