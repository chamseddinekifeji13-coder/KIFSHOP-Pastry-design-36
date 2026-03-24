-- =============================================
-- STOCK ALERTS TO PURCHASE ORDERS WORKFLOW - PART 1
-- Tables and Policies
-- =============================================

-- ============ STOCK ALERTS TABLE ============
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  packaging_id uuid REFERENCES public.packaging(id) ON DELETE CASCADE,
  consumable_id uuid REFERENCES public.consumables(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('raw_material', 'packaging', 'consumable')),
  item_name text NOT NULL,
  item_unit text NOT NULL,
  current_stock numeric(12,3) NOT NULL,
  min_stock numeric(12,3) NOT NULL,
  suggested_quantity numeric(12,3) NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'ignored', 'resolved')),
  preferred_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  preferred_supplier_name text,
  estimated_unit_price numeric(12,3),
  converted_to_appro_id uuid,
  converted_at timestamptz,
  converted_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_alerts_tenant_access" ON public.stock_alerts FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_stock_alerts_tenant ON public.stock_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_status ON public.stock_alerts(tenant_id, status);

-- ============ BON D'APPROVISIONNEMENT TABLE ============
CREATE TABLE IF NOT EXISTS public.bon_approvisionnement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'sent_to_suppliers', 'partially_ordered', 'fully_ordered', 'cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes text,
  total_items integer NOT NULL DEFAULT 0,
  estimated_total numeric(12,3) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  validated_by uuid REFERENCES auth.users(id),
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bon_approvisionnement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bon_approvisionnement_tenant_access" ON public.bon_approvisionnement FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_bon_approvisionnement_tenant ON public.bon_approvisionnement(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bon_approvisionnement_status ON public.bon_approvisionnement(tenant_id, status);

-- ============ BON D'APPROVISIONNEMENT ITEMS TABLE ============
CREATE TABLE IF NOT EXISTS public.bon_approvisionnement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_appro_id uuid NOT NULL REFERENCES public.bon_approvisionnement(id) ON DELETE CASCADE,
  stock_alert_id uuid REFERENCES public.stock_alerts(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('raw_material', 'packaging', 'consumable')),
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE SET NULL,
  packaging_id uuid REFERENCES public.packaging(id) ON DELETE SET NULL,
  consumable_id uuid REFERENCES public.consumables(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_unit text NOT NULL,
  requested_quantity numeric(12,3) NOT NULL,
  validated_quantity numeric(12,3),
  estimated_unit_price numeric(12,3),
  estimated_total numeric(12,3),
  assigned_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  assigned_supplier_name text,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ordered_quantity numeric(12,3),
  ordered_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'ordered', 'received', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bon_appro_items_bon ON public.bon_approvisionnement_items(bon_appro_id);
CREATE INDEX IF NOT EXISTS idx_bon_appro_items_alert ON public.bon_approvisionnement_items(stock_alert_id);

-- ============ WORKFLOW AUDIT LOG TABLE ============
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
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_audit_log_tenant_access" ON public.workflow_audit_log FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_workflow_audit_tenant ON public.workflow_audit_log(tenant_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_entity ON public.workflow_audit_log(entity_type, entity_id);

-- ============ SUPPLIER PRODUCT MAPPING TABLE ============
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('raw_material', 'packaging', 'consumable')),
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  packaging_id uuid REFERENCES public.packaging(id) ON DELETE CASCADE,
  consumable_id uuid REFERENCES public.consumables(id) ON DELETE CASCADE,
  unit_price numeric(12,3) NOT NULL,
  min_order_quantity numeric(12,3),
  lead_time_days integer,
  is_preferred boolean DEFAULT false,
  priority integer DEFAULT 0,
  last_order_date timestamptz,
  last_price numeric(12,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supplier_products_tenant_access" ON public.supplier_products FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_supplier_products_tenant ON public.supplier_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.supplier_products(supplier_id);
