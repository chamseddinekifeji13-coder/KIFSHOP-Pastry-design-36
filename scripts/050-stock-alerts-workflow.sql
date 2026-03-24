-- =============================================
-- STOCK ALERTS TO PURCHASE ORDERS WORKFLOW
-- Full traceability: Stock Alert -> Bon Appro -> Bon Commande Fournisseur
-- =============================================

-- ============ STOCK ALERTS TABLE ============
-- Stores detected stock alerts that can be converted to procurement orders
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Item reference (one of these will be set)
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  packaging_id uuid REFERENCES public.packaging(id) ON DELETE CASCADE,
  consumable_id uuid REFERENCES public.consumables(id) ON DELETE CASCADE,
  
  item_type text NOT NULL CHECK (item_type IN ('raw_material', 'packaging', 'consumable')),
  item_name text NOT NULL,
  item_unit text NOT NULL,
  
  -- Stock levels at alert time
  current_stock numeric(12,3) NOT NULL,
  min_stock numeric(12,3) NOT NULL,
  suggested_quantity numeric(12,3) NOT NULL, -- Calculated: min_stock * 2 - current_stock
  
  -- Severity and status
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'ignored', 'resolved')),
  
  -- Supplier info (preferred supplier for this item)
  preferred_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  preferred_supplier_name text,
  estimated_unit_price numeric(12,3),
  
  -- Conversion tracking
  converted_to_appro_id uuid, -- Will reference bon_approvisionnement
  converted_at timestamptz,
  converted_by uuid REFERENCES auth.users(id),
  
  -- Auto-resolution tracking
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
CREATE INDEX IF NOT EXISTS idx_stock_alerts_item ON public.stock_alerts(tenant_id, item_type, raw_material_id, packaging_id, consumable_id);

-- ============ BON D'APPROVISIONNEMENT TABLE ============
-- Internal procurement order that groups stock alerts
CREATE TABLE IF NOT EXISTS public.bon_approvisionnement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Reference number (auto-generated)
  reference text NOT NULL,
  
  -- Status workflow
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'sent_to_suppliers', 'partially_ordered', 'fully_ordered', 'cancelled')),
  
  -- Priority and notes
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  notes text,
  
  -- Totals (calculated from items)
  total_items integer NOT NULL DEFAULT 0,
  estimated_total numeric(12,3) NOT NULL DEFAULT 0,
  
  -- Workflow tracking
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
-- Individual items in a procurement order
CREATE TABLE IF NOT EXISTS public.bon_approvisionnement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_appro_id uuid NOT NULL REFERENCES public.bon_approvisionnement(id) ON DELETE CASCADE,
  
  -- Source alert
  stock_alert_id uuid REFERENCES public.stock_alerts(id) ON DELETE SET NULL,
  
  -- Item reference
  item_type text NOT NULL CHECK (item_type IN ('raw_material', 'packaging', 'consumable')),
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE SET NULL,
  packaging_id uuid REFERENCES public.packaging(id) ON DELETE SET NULL,
  consumable_id uuid REFERENCES public.consumables(id) ON DELETE SET NULL,
  
  item_name text NOT NULL,
  item_unit text NOT NULL,
  
  -- Quantities
  requested_quantity numeric(12,3) NOT NULL,
  validated_quantity numeric(12,3), -- May differ from requested after validation
  
  -- Pricing
  estimated_unit_price numeric(12,3),
  estimated_total numeric(12,3),
  
  -- Supplier assignment
  assigned_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  assigned_supplier_name text,
  
  -- Order tracking
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  ordered_quantity numeric(12,3),
  ordered_at timestamptz,
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'ordered', 'received', 'cancelled')),
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bon_appro_items_bon ON public.bon_approvisionnement_items(bon_appro_id);
CREATE INDEX IF NOT EXISTS idx_bon_appro_items_alert ON public.bon_approvisionnement_items(stock_alert_id);

-- ============ WORKFLOW AUDIT LOG TABLE ============
-- Complete traceability of all workflow actions
CREATE TABLE IF NOT EXISTS public.workflow_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- What was affected
  entity_type text NOT NULL CHECK (entity_type IN ('stock_alert', 'bon_approvisionnement', 'purchase_order', 'delivery_note', 'purchase_invoice')),
  entity_id uuid NOT NULL,
  
  -- What happened
  action text NOT NULL CHECK (action IN (
    'created', 'updated', 'validated', 'cancelled', 'converted',
    'sent_to_supplier', 'ordered', 'received', 'auto_resolved'
  )),
  
  -- Details
  old_status text,
  new_status text,
  details jsonb,
  
  -- Related entities for traceability
  related_alert_id uuid,
  related_appro_id uuid,
  related_order_id uuid,
  
  -- Who and when
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_audit_log_tenant_access" ON public.workflow_audit_log FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_workflow_audit_tenant ON public.workflow_audit_log(tenant_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_audit_entity ON public.workflow_audit_log(entity_type, entity_id);

-- ============ SUPPLIER PRODUCT MAPPING TABLE ============
-- Maps which suppliers can provide which products and at what price
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  
  -- Product reference
  item_type text NOT NULL CHECK (item_type IN ('raw_material', 'packaging', 'consumable')),
  raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  packaging_id uuid REFERENCES public.packaging(id) ON DELETE CASCADE,
  consumable_id uuid REFERENCES public.consumables(id) ON DELETE CASCADE,
  
  -- Pricing and terms
  unit_price numeric(12,3) NOT NULL,
  min_order_quantity numeric(12,3),
  lead_time_days integer,
  
  -- Priority (for auto-selection)
  is_preferred boolean DEFAULT false,
  priority integer DEFAULT 0,
  
  last_order_date timestamptz,
  last_price numeric(12,3),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(supplier_id, item_type, raw_material_id),
  UNIQUE(supplier_id, item_type, packaging_id),
  UNIQUE(supplier_id, item_type, consumable_id)
);

ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_products_tenant_access" ON public.supplier_products FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_supplier_products_tenant ON public.supplier_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_item ON public.supplier_products(item_type, raw_material_id, packaging_id, consumable_id);

-- ============ FUNCTIONS ============

-- Function to generate reference number for bon d'approvisionnement
CREATE OR REPLACE FUNCTION generate_appro_reference(p_tenant_id text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_year text;
  v_ref text;
BEGIN
  v_year := to_char(now(), 'YY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.bon_approvisionnement
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('year', now());
  
  v_ref := 'BA-' || v_year || '-' || lpad(v_count::text, 4, '0');
  
  RETURN v_ref;
END;
$$;

-- Function to detect and create stock alerts
CREATE OR REPLACE FUNCTION detect_stock_alerts(p_tenant_id text)
RETURNS TABLE(
  alert_id uuid,
  item_type text,
  item_id uuid,
  item_name text,
  current_stock numeric,
  min_stock numeric,
  severity text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  
  -- Raw materials below threshold
  SELECT 
    sa.id as alert_id,
    'raw_material'::text as item_type,
    rm.id as item_id,
    rm.name as item_name,
    rm.current_stock,
    rm.min_stock,
    CASE 
      WHEN rm.current_stock = 0 THEN 'critical'
      WHEN rm.current_stock <= rm.min_stock * 0.25 THEN 'critical'
      WHEN rm.current_stock <= rm.min_stock * 0.5 THEN 'warning'
      ELSE 'info'
    END as severity
  FROM public.raw_materials rm
  LEFT JOIN public.stock_alerts sa ON sa.raw_material_id = rm.id 
    AND sa.status = 'pending' 
    AND sa.tenant_id = p_tenant_id
  WHERE rm.tenant_id = p_tenant_id
    AND rm.current_stock <= rm.min_stock
    AND rm.min_stock > 0
  
  UNION ALL
  
  -- Packaging below threshold
  SELECT 
    sa.id as alert_id,
    'packaging'::text as item_type,
    p.id as item_id,
    p.name as item_name,
    p.current_stock,
    p.min_stock,
    CASE 
      WHEN p.current_stock = 0 THEN 'critical'
      WHEN p.current_stock <= p.min_stock * 0.25 THEN 'critical'
      WHEN p.current_stock <= p.min_stock * 0.5 THEN 'warning'
      ELSE 'info'
    END as severity
  FROM public.packaging p
  LEFT JOIN public.stock_alerts sa ON sa.packaging_id = p.id 
    AND sa.status = 'pending' 
    AND sa.tenant_id = p_tenant_id
  WHERE p.tenant_id = p_tenant_id
    AND p.current_stock <= p.min_stock
    AND p.min_stock > 0
  
  UNION ALL
  
  -- Consumables below threshold
  SELECT 
    sa.id as alert_id,
    'consumable'::text as item_type,
    c.id as item_id,
    c.name as item_name,
    c.current_stock,
    c.min_stock,
    CASE 
      WHEN c.current_stock = 0 THEN 'critical'
      WHEN c.current_stock <= c.min_stock * 0.25 THEN 'critical'
      WHEN c.current_stock <= c.min_stock * 0.5 THEN 'warning'
      ELSE 'info'
    END as severity
  FROM public.consumables c
  LEFT JOIN public.stock_alerts sa ON sa.consumable_id = c.id 
    AND sa.status = 'pending' 
    AND sa.tenant_id = p_tenant_id
  WHERE c.tenant_id = p_tenant_id
    AND c.current_stock <= c.min_stock
    AND c.min_stock > 0;
END;
$$;

-- Function to create stock alerts from detection
CREATE OR REPLACE FUNCTION create_pending_stock_alerts(p_tenant_id text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer := 0;
  v_row record;
BEGIN
  FOR v_row IN 
    SELECT * FROM detect_stock_alerts(p_tenant_id) WHERE alert_id IS NULL
  LOOP
    INSERT INTO public.stock_alerts (
      tenant_id,
      item_type,
      raw_material_id,
      packaging_id,
      consumable_id,
      item_name,
      item_unit,
      current_stock,
      min_stock,
      suggested_quantity,
      severity,
      preferred_supplier_id,
      preferred_supplier_name,
      estimated_unit_price
    )
    SELECT 
      p_tenant_id,
      v_row.item_type,
      CASE WHEN v_row.item_type = 'raw_material' THEN v_row.item_id ELSE NULL END,
      CASE WHEN v_row.item_type = 'packaging' THEN v_row.item_id ELSE NULL END,
      CASE WHEN v_row.item_type = 'consumable' THEN v_row.item_id ELSE NULL END,
      v_row.item_name,
      COALESCE(
        (SELECT unit FROM public.raw_materials WHERE id = v_row.item_id AND v_row.item_type = 'raw_material'),
        (SELECT unit FROM public.packaging WHERE id = v_row.item_id AND v_row.item_type = 'packaging'),
        (SELECT unit FROM public.consumables WHERE id = v_row.item_id AND v_row.item_type = 'consumable'),
        'unit'
      ),
      v_row.current_stock,
      v_row.min_stock,
      GREATEST(v_row.min_stock * 2 - v_row.current_stock, v_row.min_stock),
      v_row.severity,
      sp.supplier_id,
      s.name,
      sp.unit_price
    FROM (SELECT 1) AS dummy
    LEFT JOIN public.supplier_products sp ON 
      sp.tenant_id = p_tenant_id AND
      sp.item_type = v_row.item_type AND
      (
        (v_row.item_type = 'raw_material' AND sp.raw_material_id = v_row.item_id) OR
        (v_row.item_type = 'packaging' AND sp.packaging_id = v_row.item_id) OR
        (v_row.item_type = 'consumable' AND sp.consumable_id = v_row.item_id)
      ) AND
      sp.is_preferred = true
    LEFT JOIN public.suppliers s ON s.id = sp.supplier_id
    LIMIT 1;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Function to convert alerts to bon d'approvisionnement
CREATE OR REPLACE FUNCTION convert_alerts_to_appro(
  p_tenant_id text,
  p_alert_ids uuid[],
  p_user_id uuid,
  p_priority text DEFAULT 'normal',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_appro_id uuid;
  v_reference text;
  v_total_items integer;
  v_estimated_total numeric := 0;
BEGIN
  -- Generate reference
  v_reference := generate_appro_reference(p_tenant_id);
  
  -- Create bon d'approvisionnement
  INSERT INTO public.bon_approvisionnement (
    tenant_id, reference, status, priority, notes, created_by
  ) VALUES (
    p_tenant_id, v_reference, 'draft', p_priority, p_notes, p_user_id
  ) RETURNING id INTO v_appro_id;
  
  -- Create items from alerts
  INSERT INTO public.bon_approvisionnement_items (
    bon_appro_id,
    stock_alert_id,
    item_type,
    raw_material_id,
    packaging_id,
    consumable_id,
    item_name,
    item_unit,
    requested_quantity,
    estimated_unit_price,
    estimated_total,
    assigned_supplier_id,
    assigned_supplier_name
  )
  SELECT 
    v_appro_id,
    sa.id,
    sa.item_type,
    sa.raw_material_id,
    sa.packaging_id,
    sa.consumable_id,
    sa.item_name,
    sa.item_unit,
    sa.suggested_quantity,
    sa.estimated_unit_price,
    sa.suggested_quantity * COALESCE(sa.estimated_unit_price, 0),
    sa.preferred_supplier_id,
    sa.preferred_supplier_name
  FROM public.stock_alerts sa
  WHERE sa.id = ANY(p_alert_ids)
    AND sa.tenant_id = p_tenant_id
    AND sa.status = 'pending';
  
  GET DIAGNOSTICS v_total_items = ROW_COUNT;
  
  -- Calculate estimated total
  SELECT COALESCE(SUM(estimated_total), 0) INTO v_estimated_total
  FROM public.bon_approvisionnement_items
  WHERE bon_appro_id = v_appro_id;
  
  -- Update bon with totals
  UPDATE public.bon_approvisionnement
  SET total_items = v_total_items, estimated_total = v_estimated_total
  WHERE id = v_appro_id;
  
  -- Update alerts status
  UPDATE public.stock_alerts
  SET status = 'converted',
      converted_to_appro_id = v_appro_id,
      converted_at = now(),
      converted_by = p_user_id,
      updated_at = now()
  WHERE id = ANY(p_alert_ids)
    AND tenant_id = p_tenant_id;
  
  -- Log the action
  INSERT INTO public.workflow_audit_log (
    tenant_id, entity_type, entity_id, action, new_status,
    details, performed_by
  ) VALUES (
    p_tenant_id, 'bon_approvisionnement', v_appro_id, 'created', 'draft',
    jsonb_build_object(
      'alert_count', array_length(p_alert_ids, 1),
      'alert_ids', p_alert_ids,
      'estimated_total', v_estimated_total
    ),
    p_user_id
  );
  
  RETURN v_appro_id;
END;
$$;

-- Function to generate purchase orders from bon d'approvisionnement
CREATE OR REPLACE FUNCTION generate_purchase_orders_from_appro(
  p_appro_id uuid,
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id text;
  v_supplier_id uuid;
  v_supplier_name text;
  v_order_id uuid;
  v_count integer := 0;
  v_supplier record;
BEGIN
  -- Get tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM public.bon_approvisionnement
  WHERE id = p_appro_id;
  
  -- Group items by supplier and create orders
  FOR v_supplier IN
    SELECT DISTINCT 
      bai.assigned_supplier_id,
      bai.assigned_supplier_name
    FROM public.bon_approvisionnement_items bai
    WHERE bai.bon_appro_id = p_appro_id
      AND bai.status = 'validated'
      AND bai.assigned_supplier_id IS NOT NULL
  LOOP
    -- Create purchase order for this supplier
    INSERT INTO public.purchase_orders (
      tenant_id,
      supplier_id,
      supplier_name,
      status,
      total,
      notes,
      created_by
    )
    SELECT 
      v_tenant_id,
      v_supplier.assigned_supplier_id,
      v_supplier.assigned_supplier_name,
      'brouillon',
      COALESCE(SUM(bai.estimated_total), 0),
      'Généré automatiquement depuis ' || ba.reference,
      p_user_id
    FROM public.bon_approvisionnement_items bai
    JOIN public.bon_approvisionnement ba ON ba.id = bai.bon_appro_id
    WHERE bai.bon_appro_id = p_appro_id
      AND bai.assigned_supplier_id = v_supplier.assigned_supplier_id
      AND bai.status = 'validated'
    GROUP BY ba.reference
    RETURNING id INTO v_order_id;
    
    -- Create purchase order items
    INSERT INTO public.purchase_order_items (
      purchase_order_id,
      name,
      quantity,
      unit,
      unit_price
    )
    SELECT 
      v_order_id,
      bai.item_name,
      COALESCE(bai.validated_quantity, bai.requested_quantity),
      bai.item_unit,
      COALESCE(bai.estimated_unit_price, 0)
    FROM public.bon_approvisionnement_items bai
    WHERE bai.bon_appro_id = p_appro_id
      AND bai.assigned_supplier_id = v_supplier.assigned_supplier_id
      AND bai.status = 'validated';
    
    -- Update appro items with order reference
    UPDATE public.bon_approvisionnement_items
    SET purchase_order_id = v_order_id,
        ordered_quantity = COALESCE(validated_quantity, requested_quantity),
        ordered_at = now(),
        status = 'ordered'
    WHERE bon_appro_id = p_appro_id
      AND assigned_supplier_id = v_supplier.assigned_supplier_id
      AND status = 'validated';
    
    -- Log the order creation
    INSERT INTO public.workflow_audit_log (
      tenant_id, entity_type, entity_id, action, new_status,
      details, related_appro_id, performed_by
    ) VALUES (
      v_tenant_id, 'purchase_order', v_order_id, 'created', 'brouillon',
      jsonb_build_object(
        'source', 'bon_approvisionnement',
        'appro_reference', (SELECT reference FROM public.bon_approvisionnement WHERE id = p_appro_id),
        'supplier_name', v_supplier.assigned_supplier_name
      ),
      p_appro_id,
      p_user_id
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  -- Update bon status
  UPDATE public.bon_approvisionnement
  SET status = CASE 
    WHEN v_count > 0 THEN 'fully_ordered'
    ELSE status
  END,
  updated_at = now()
  WHERE id = p_appro_id;
  
  RETURN v_count;
END;
$$;

-- ============ TRIGGERS ============

-- Trigger to auto-resolve alerts when stock is replenished
CREATE OR REPLACE FUNCTION auto_resolve_stock_alerts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- For raw_materials
  IF TG_TABLE_NAME = 'raw_materials' THEN
    UPDATE public.stock_alerts
    SET status = 'resolved',
        resolved_at = now(),
        resolution_note = 'Stock réapprovisionné automatiquement',
        updated_at = now()
    WHERE raw_material_id = NEW.id
      AND status = 'pending'
      AND NEW.current_stock > NEW.min_stock;
  
  -- For packaging
  ELSIF TG_TABLE_NAME = 'packaging' THEN
    UPDATE public.stock_alerts
    SET status = 'resolved',
        resolved_at = now(),
        resolution_note = 'Stock réapprovisionné automatiquement',
        updated_at = now()
    WHERE packaging_id = NEW.id
      AND status = 'pending'
      AND NEW.current_stock > NEW.min_stock;
  
  -- For consumables
  ELSIF TG_TABLE_NAME = 'consumables' THEN
    UPDATE public.stock_alerts
    SET status = 'resolved',
        resolved_at = now(),
        resolution_note = 'Stock réapprovisionné automatiquement',
        updated_at = now()
    WHERE consumable_id = NEW.id
      AND status = 'pending'
      AND NEW.current_stock > NEW.min_stock;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers on stock tables
DROP TRIGGER IF EXISTS trg_auto_resolve_raw_materials ON public.raw_materials;
CREATE TRIGGER trg_auto_resolve_raw_materials
  AFTER UPDATE OF current_stock ON public.raw_materials
  FOR EACH ROW
  WHEN (NEW.current_stock > OLD.current_stock)
  EXECUTE FUNCTION auto_resolve_stock_alerts();

DROP TRIGGER IF EXISTS trg_auto_resolve_packaging ON public.packaging;
CREATE TRIGGER trg_auto_resolve_packaging
  AFTER UPDATE OF current_stock ON public.packaging
  FOR EACH ROW
  WHEN (NEW.current_stock > OLD.current_stock)
  EXECUTE FUNCTION auto_resolve_stock_alerts();

DROP TRIGGER IF EXISTS trg_auto_resolve_consumables ON public.consumables;
CREATE TRIGGER trg_auto_resolve_consumables
  AFTER UPDATE OF current_stock ON public.consumables
  FOR EACH ROW
  WHEN (NEW.current_stock > OLD.current_stock)
  EXECUTE FUNCTION auto_resolve_stock_alerts();

-- ============ REALTIME SUBSCRIPTIONS ============
-- Enable realtime for workflow tables

ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bon_approvisionnement;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_audit_log;

-- Grant necessary permissions
GRANT ALL ON public.stock_alerts TO authenticated;
GRANT ALL ON public.bon_approvisionnement TO authenticated;
GRANT ALL ON public.bon_approvisionnement_items TO authenticated;
GRANT ALL ON public.workflow_audit_log TO authenticated;
GRANT ALL ON public.supplier_products TO authenticated;

GRANT EXECUTE ON FUNCTION generate_appro_reference TO authenticated;
GRANT EXECUTE ON FUNCTION detect_stock_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION create_pending_stock_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION convert_alerts_to_appro TO authenticated;
GRANT EXECUTE ON FUNCTION generate_purchase_orders_from_appro TO authenticated;
