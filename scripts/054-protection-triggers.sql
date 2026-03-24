-- =============================================
-- PROTECTION TRIGGERS FOR CRITICAL TABLES
-- Prevents accidental mass deletions
-- =============================================

-- 1. Create audit table for tracking deletions
CREATE TABLE IF NOT EXISTS public.deletion_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  table_name text NOT NULL,
  record_id uuid,
  record_data jsonb,
  deleted_by uuid,
  deleted_at timestamptz DEFAULT NOW(),
  deletion_type text CHECK (deletion_type IN ('single', 'bulk', 'truncate')),
  row_count integer DEFAULT 1
);

-- 2. Function to prevent mass deletions (more than 10 rows at once)
CREATE OR REPLACE FUNCTION public.prevent_mass_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_count integer;
  v_threshold integer := 10; -- Max rows allowed to delete at once
BEGIN
  -- Count how many rows would be deleted
  EXECUTE format('SELECT COUNT(*) FROM %I.%I WHERE ctid = ANY($1)', TG_TABLE_SCHEMA, TG_TABLE_NAME)
  INTO v_count
  USING ARRAY(SELECT ctid FROM old_table);
  
  -- If trying to delete more than threshold, raise exception
  IF v_count > v_threshold THEN
    RAISE EXCEPTION 'PROTECTION: Tentative de suppression de % lignes dans %. Maximum autorisé: %. Utilisez une suppression par lots ou désactivez temporairement la protection.', 
      v_count, TG_TABLE_NAME, v_threshold;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to archive deleted records before deletion
CREATE OR REPLACE FUNCTION public.archive_before_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.deletion_audit_log (
    tenant_id,
    table_name,
    record_id,
    record_data,
    deleted_by,
    deletion_type
  ) VALUES (
    OLD.tenant_id,
    TG_TABLE_NAME,
    OLD.id,
    to_jsonb(OLD),
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'single'
  );
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply protection triggers to critical tables

-- finished_products protection
DROP TRIGGER IF EXISTS protect_finished_products_mass_delete ON public.finished_products;
DROP TRIGGER IF EXISTS archive_finished_products_delete ON public.finished_products;

CREATE TRIGGER archive_finished_products_delete
  BEFORE DELETE ON public.finished_products
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_before_delete();

-- raw_materials protection
DROP TRIGGER IF EXISTS archive_raw_materials_delete ON public.raw_materials;

CREATE TRIGGER archive_raw_materials_delete
  BEFORE DELETE ON public.raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_before_delete();

-- consumables protection
DROP TRIGGER IF EXISTS archive_consumables_delete ON public.consumables;

CREATE TRIGGER archive_consumables_delete
  BEFORE DELETE ON public.consumables
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_before_delete();

-- orders protection
DROP TRIGGER IF EXISTS archive_orders_delete ON public.orders;

CREATE TRIGGER archive_orders_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_before_delete();

-- clients protection
DROP TRIGGER IF EXISTS archive_clients_delete ON public.clients;

CREATE TRIGGER archive_clients_delete
  BEFORE DELETE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_before_delete();

-- stock_by_location protection
DROP TRIGGER IF EXISTS archive_stock_by_location_delete ON public.stock_by_location;

CREATE TRIGGER archive_stock_by_location_delete
  BEFORE DELETE ON public.stock_by_location
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_before_delete();

-- 5. Function to restore deleted records
CREATE OR REPLACE FUNCTION public.restore_deleted_record(
  p_audit_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_record public.deletion_audit_log;
  v_result jsonb;
BEGIN
  -- Get the audit record
  SELECT * INTO v_record FROM public.deletion_audit_log WHERE id = p_audit_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Enregistrement audit non trouvé');
  END IF;
  
  -- Restore based on table name
  CASE v_record.table_name
    WHEN 'finished_products' THEN
      INSERT INTO public.finished_products 
      SELECT * FROM jsonb_populate_record(null::public.finished_products, v_record.record_data);
    WHEN 'raw_materials' THEN
      INSERT INTO public.raw_materials 
      SELECT * FROM jsonb_populate_record(null::public.raw_materials, v_record.record_data);
    WHEN 'consumables' THEN
      INSERT INTO public.consumables 
      SELECT * FROM jsonb_populate_record(null::public.consumables, v_record.record_data);
    WHEN 'orders' THEN
      INSERT INTO public.orders 
      SELECT * FROM jsonb_populate_record(null::public.orders, v_record.record_data);
    WHEN 'clients' THEN
      INSERT INTO public.clients 
      SELECT * FROM jsonb_populate_record(null::public.clients, v_record.record_data);
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Table non supportée pour la restauration');
  END CASE;
  
  -- Remove from audit log after successful restore
  DELETE FROM public.deletion_audit_log WHERE id = p_audit_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'table', v_record.table_name,
    'record_id', v_record.record_id
  );
END;
$$ LANGUAGE plpgsql;

-- 6. RLS for deletion_audit_log
ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deletion_audit_log_tenant_access" ON public.deletion_audit_log
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.deletion_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_deleted_record(uuid) TO authenticated;
