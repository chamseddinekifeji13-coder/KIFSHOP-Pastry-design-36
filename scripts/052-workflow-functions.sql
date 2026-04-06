-- =============================================
-- WORKFLOW FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to generate bon d'approvisionnement reference
CREATE OR REPLACE FUNCTION public.generate_appro_reference(p_tenant_id uuid)
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
    AND created_at >= date_trunc('year', now())::date;
  
  v_ref := 'BA-' || v_year || '-' || lpad(v_count::text, 4, '0');
  RETURN v_ref;
END;
$$;

-- Function to convert stock alerts to bon d'approvisionnement
CREATE OR REPLACE FUNCTION public.convert_alerts_to_appro(
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
  v_tenant_id uuid;
BEGIN
  -- Get tenant_id from the first alert
  SELECT tenant_id INTO v_tenant_id
  FROM public.stock_alerts
  WHERE id = p_alert_ids[1];

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No alerts found';
  END IF;
  
  -- Generate reference
  v_reference := public.generate_appro_reference(v_tenant_id);
  
  -- Create bon d'approvisionnement
  INSERT INTO public.bon_approvisionnement (
    tenant_id, reference, status, priority, created_by
  ) VALUES (
    v_tenant_id, v_reference, 'draft', p_priority, p_user_id
  ) RETURNING id INTO v_appro_id;
  
  -- Create items from alerts
  INSERT INTO public.bon_approvisionnement_items (
    bon_appro_id,
    stock_alert_id,
    item_type,
    raw_material_id,
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
    sa.item_name,
    sa.item_unit,
    sa.suggested_quantity,
    sa.estimated_unit_price,
    sa.suggested_quantity * COALESCE(sa.estimated_unit_price, 0),
    sa.preferred_supplier_id,
    sa.preferred_supplier_name
  FROM public.stock_alerts sa
  WHERE sa.id = ANY(p_alert_ids)
    AND sa.tenant_id = v_tenant_id
    AND sa.status = 'pending';
  
  GET DIAGNOSTICS v_total_items = ROW_COUNT;
  
  -- Calculate estimated total
  SELECT COALESCE(SUM(estimated_total), 0) INTO v_estimated_total
  FROM public.bon_approvisionnement_items
  WHERE bon_appro_id = v_appro_id;
  
  -- Update bon with totals
  UPDATE public.bon_approvisionnement
  SET total_items = v_total_items, estimated_total = v_estimated_total, updated_at = now()
  WHERE id = v_appro_id;
  
  -- Update alerts status
  UPDATE public.stock_alerts
  SET status = 'converted',
      converted_to_appro_id = v_appro_id,
      converted_at = now(),
      converted_by = p_user_id,
      updated_at = now()
  WHERE id = ANY(p_alert_ids)
    AND tenant_id = v_tenant_id;
  
  -- Log the action
  INSERT INTO public.workflow_audit_log (
    tenant_id, entity_type, entity_id, action, new_status,
    details, performed_by
  ) VALUES (
    v_tenant_id, 'bon_approvisionnement', v_appro_id, 'created', 'draft',
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
CREATE OR REPLACE FUNCTION public.generate_purchase_orders_from_appro(
  p_appro_id uuid,
  p_user_id uuid
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_order_id uuid;
  v_count integer := 0;
  v_supplier record;
  v_supplier_name text;
  v_supplier_id uuid;
BEGIN
  -- Get tenant_id from bon
  SELECT tenant_id INTO v_tenant_id
  FROM public.bon_approvisionnement
  WHERE id = p_appro_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Bon approvisionnement not found';
  END IF;
  
  -- Group items by supplier and create orders
  FOR v_supplier IN
    SELECT DISTINCT 
      bai.assigned_supplier_id,
      bai.assigned_supplier_name
    FROM public.bon_approvisionnement_items bai
    WHERE bai.bon_appro_id = p_appro_id
      AND bai.status IN ('pending', 'validated')
      AND (
        bai.assigned_supplier_id IS NOT NULL
        OR bai.assigned_supplier_name IS NOT NULL
      )
  LOOP
    v_supplier_id := v_supplier.assigned_supplier_id;
    v_supplier_name := v_supplier.assigned_supplier_name;
    
    -- Create purchase order for this supplier
    INSERT INTO public.orders (
      tenant_id,
      customer_id,
      customer_name,
      customer_phone,
      total,
      notes,
      source,
      status,
      created_at
    )
    SELECT 
      v_tenant_id,
      v_supplier_id,
      v_supplier_name,
      NULL,
      COALESCE(SUM(bai.estimated_total), 0),
      'Généré depuis ' || ba.reference,
      'approvisionnement',
      'draft',
      now()
    FROM public.bon_approvisionnement_items bai
    JOIN public.bon_approvisionnement ba ON ba.id = bai.bon_appro_id
    WHERE bai.bon_appro_id = p_appro_id
      AND bai.status IN ('pending', 'validated')
      AND (
        bai.assigned_supplier_id = v_supplier_id
        OR (
          bai.assigned_supplier_id IS NULL
          AND bai.assigned_supplier_name = v_supplier_name
        )
      )
    GROUP BY ba.reference
    RETURNING id INTO v_order_id;
    
    -- Update appro items with order reference
    UPDATE public.bon_approvisionnement_items
    SET purchase_order_id = v_order_id,
        ordered_quantity = COALESCE(validated_quantity, requested_quantity),
        ordered_at = now(),
        status = 'ordered',
        updated_at = now()
    WHERE bon_appro_id = p_appro_id
      AND status IN ('pending', 'validated')
      AND (
        assigned_supplier_id = v_supplier_id
        OR (
          assigned_supplier_id IS NULL
          AND assigned_supplier_name = v_supplier_name
        )
      );
    
    -- Log the order creation
    INSERT INTO public.workflow_audit_log (
      tenant_id, entity_type, entity_id, action, new_status,
      details, related_appro_id, performed_by
    ) VALUES (
      v_tenant_id, 'purchase_order', v_order_id, 'created', 'draft',
      jsonb_build_object(
        'source', 'bon_approvisionnement',
        'supplier_name', v_supplier_name
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
  END,
  updated_at = now()
  WHERE id = p_appro_id;
  
  RETURN v_count;
END;
$$;

-- Trigger function to create audit log on stock alert creation
CREATE OR REPLACE FUNCTION public.trigger_stock_alert_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.workflow_audit_log (
    tenant_id, entity_type, entity_id, action, new_status,
    details, performed_by
  ) VALUES (
    NEW.tenant_id, 'stock_alert', NEW.id, 'created', NEW.status,
    jsonb_build_object(
      'item_type', NEW.item_type,
      'item_name', NEW.item_name,
      'severity', NEW.severity,
      'current_stock', NEW.current_stock,
      'min_stock', NEW.min_stock
    ),
    NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_stock_alert_audit ON public.stock_alerts;
CREATE TRIGGER tg_stock_alert_audit
AFTER INSERT ON public.stock_alerts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_stock_alert_audit();

-- Trigger to update bon_approvisionnement timestamp
CREATE OR REPLACE FUNCTION public.trigger_update_bon_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.bon_approvisionnement
  SET updated_at = now()
  WHERE id = NEW.bon_appro_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_update_bon_items_timestamp ON public.bon_approvisionnement_items;
CREATE TRIGGER tg_update_bon_items_timestamp
AFTER UPDATE ON public.bon_approvisionnement_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_bon_timestamp();
