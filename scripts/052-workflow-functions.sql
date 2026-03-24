-- =============================================
-- STOCK ALERTS TO PURCHASE ORDERS WORKFLOW - PART 2
-- Functions and Triggers
-- =============================================

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

-- Function to detect stock alerts from inventory items
CREATE OR REPLACE FUNCTION detect_stock_alerts(p_tenant_id text)
RETURNS TABLE(
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
  SELECT 
    'raw_material'::text,
    rm.id,
    rm.name,
    rm.current_stock,
    rm.min_stock,
    CASE 
      WHEN rm.current_stock = 0 THEN 'critical'
      WHEN rm.current_stock <= rm.min_stock * 0.25 THEN 'critical'
      WHEN rm.current_stock <= rm.min_stock * 0.5 THEN 'warning'
      ELSE 'info'
    END
  FROM public.raw_materials rm
  WHERE rm.tenant_id = p_tenant_id
    AND rm.current_stock <= rm.min_stock
    AND rm.min_stock > 0;
END;
$$;

-- Function to convert alerts to bon d'approvisionnement
CREATE OR REPLACE FUNCTION convert_alerts_to_appro(
  p_tenant_id text,
  p_alert_ids uuid[],
  p_user_id uuid,
  p_priority text DEFAULT 'normal'
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
    tenant_id, reference, status, priority, created_by
  ) VALUES (
    p_tenant_id, v_reference, 'draft', p_priority, p_user_id
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
      'Généré depuis ' || ba.reference,
      p_user_id
    FROM public.bon_approvisionnement_items bai
    JOIN public.bon_approvisionnement ba ON ba.id = bai.bon_appro_id
    WHERE bai.bon_appro_id = p_appro_id
      AND bai.assigned_supplier_id = v_supplier.assigned_supplier_id
      AND bai.status = 'validated'
    GROUP BY ba.reference
    RETURNING id INTO v_order_id;
    
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
        'supplier_name', v_supplier.assigned_supplier_name
      ),
      p_appro_id,
      p_user_id
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  -- Update bon_approvisionnement status
  UPDATE public.bon_approvisionnement
  SET status = CASE 
    WHEN v_count = 0 THEN 'validated'
    ELSE 'partially_ordered'
  END
  WHERE id = p_appro_id;
  
  RETURN v_count;
END;
$$;

-- Trigger to create audit log on stock alert creation
CREATE OR REPLACE FUNCTION trigger_stock_alert_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.workflow_audit_log (
    tenant_id, entity_type, entity_id, action, new_status,
    details, performed_by, performed_at
  ) VALUES (
    NEW.tenant_id, 'stock_alert', NEW.id, 'created', NEW.status,
    jsonb_build_object(
      'item_type', NEW.item_type,
      'item_name', NEW.item_name,
      'severity', NEW.severity,
      'current_stock', NEW.current_stock,
      'min_stock', NEW.min_stock
    ),
    NEW.created_by,
    NEW.created_at
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_stock_alert_audit ON public.stock_alerts;
CREATE TRIGGER tg_stock_alert_audit
AFTER INSERT ON public.stock_alerts
FOR EACH ROW
EXECUTE FUNCTION trigger_stock_alert_audit();
