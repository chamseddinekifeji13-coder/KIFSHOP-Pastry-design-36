-- ============================================================================
-- DELIVERY EXPORT TABLES - PART 2: FUNCTIONS
-- ============================================================================

BEGIN;

-- Function to generate tracking reference
CREATE OR REPLACE FUNCTION generate_tracking_reference(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_year TEXT;
  v_sequence INTEGER;
  v_reference TEXT;
BEGIN
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO v_prefix
  FROM tenants WHERE id = p_tenant_id;
  
  IF v_prefix IS NULL THEN
    v_prefix := 'KIF';
  END IF;
  
  v_year := TO_CHAR(NOW(), 'YY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(tracking_number, '^[A-Z]+-[0-9]+-', ''), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM delivery_shipments
  WHERE tenant_id = p_tenant_id
  AND tracking_number LIKE v_prefix || '-' || v_year || '-%';
  
  v_reference := v_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
  
  RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate shipping cost
CREATE OR REPLACE FUNCTION calculate_shipping_cost(
  p_tenant_id TEXT,
  p_provider_code TEXT,
  p_governorate TEXT,
  p_weight DECIMAL,
  p_cod_amount DECIMAL,
  p_delivery_type TEXT DEFAULT 'standard'
)
RETURNS DECIMAL AS $$
DECLARE
  v_rate RECORD;
  v_cost DECIMAL := 0;
  v_cod_fee DECIMAL := 0;
BEGIN
  SELECT * INTO v_rate
  FROM delivery_rates
  WHERE tenant_id = p_tenant_id
  AND provider_code = p_provider_code
  AND is_active = true
  AND p_governorate = ANY(governorates)
  LIMIT 1;
  
  IF v_rate IS NULL THEN
    RETURN 7.000;
  END IF;
  
  v_cost := v_rate.base_rate;
  
  IF p_weight > v_rate.min_weight THEN
    v_cost := v_cost + ((p_weight - v_rate.min_weight) * v_rate.rate_per_kg);
  END IF;
  
  IF p_cod_amount > 0 THEN
    v_cod_fee := GREATEST(v_rate.cod_fee, p_cod_amount * v_rate.cod_percentage / 100);
    v_cost := v_cost + v_cod_fee;
  END IF;
  
  IF p_delivery_type = 'express' THEN
    v_cost := v_cost + v_rate.express_surcharge;
  ELSIF p_delivery_type = 'same_day' THEN
    v_cost := v_cost + v_rate.same_day_surcharge;
  END IF;
  
  RETURN v_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to update shipment status
CREATE OR REPLACE FUNCTION update_shipment_status(
  p_shipment_id UUID,
  p_status TEXT,
  p_status_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_status TEXT;
  v_history JSONB;
BEGIN
  SELECT status, COALESCE(status_history, '[]'::jsonb)
  INTO v_current_status, v_history
  FROM delivery_shipments
  WHERE id = p_shipment_id;
  
  v_history := v_history || jsonb_build_object(
    'from_status', v_current_status,
    'to_status', p_status,
    'reason', p_status_reason,
    'timestamp', NOW()
  );
  
  UPDATE delivery_shipments
  SET 
    status = p_status,
    status_reason = p_status_reason,
    status_history = v_history,
    updated_at = NOW(),
    delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
    returned_at = CASE WHEN p_status = 'returned' THEN NOW() ELSE returned_at END
  WHERE id = p_shipment_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
