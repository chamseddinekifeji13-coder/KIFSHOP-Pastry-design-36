-- RPC function to get raw materials where current_stock <= min_stock
-- This is needed because Supabase PostgREST cannot compare two columns directly
CREATE OR REPLACE FUNCTION get_critical_stock(p_tenant_id uuid)
RETURNS SETOF raw_materials
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM raw_materials
  WHERE tenant_id = p_tenant_id
    AND min_stock > 0
    AND current_stock <= min_stock
  ORDER BY (current_stock::float / NULLIF(min_stock::float, 0)) ASC;
$$;
