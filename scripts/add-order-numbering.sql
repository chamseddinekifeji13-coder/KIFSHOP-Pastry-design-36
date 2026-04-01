-- =============================================
-- Order Numbering System
-- Adds sequential order numbers per tenant
-- with daily counter reset capability
-- =============================================

-- 1. Add order_number columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number_display TEXT;

-- 2. Create order_counters table for atomic counter management
CREATE TABLE IF NOT EXISTS order_counters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  current_counter INT NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS on order_counters
ALTER TABLE order_counters ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_counters
CREATE POLICY "Users can view their tenant counter"
  ON order_counters FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their tenant counter"
  ON order_counters FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert their tenant counter"
  ON order_counters FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

-- 3. RPC function to atomically get the next order number
CREATE OR REPLACE FUNCTION get_next_order_number(p_tenant_id UUID)
RETURNS TABLE(next_number INT, display_text TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next INT;
  v_display TEXT;
BEGIN
  -- Upsert: increment counter or create with 1
  INSERT INTO order_counters (tenant_id, current_counter, updated_at)
  VALUES (p_tenant_id, 1, now())
  ON CONFLICT (tenant_id) DO UPDATE
  SET current_counter = order_counters.current_counter + 1,
      updated_at = now()
  RETURNING current_counter INTO v_next;

  -- Format display text as CMD-XXX (zero-padded to 3 digits minimum)
  v_display := 'CMD-' || LPAD(v_next::TEXT, 3, '0');

  RETURN QUERY SELECT v_next, v_display;
END;
$$;

-- 4. RPC function to reset the counter
CREATE OR REPLACE FUNCTION reset_order_counter(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE order_counters
  SET current_counter = 0,
      last_reset_at = now(),
      updated_at = now()
  WHERE tenant_id = p_tenant_id;

  -- If no row exists, create one at 0
  IF NOT FOUND THEN
    INSERT INTO order_counters (tenant_id, current_counter, last_reset_at)
    VALUES (p_tenant_id, 0, now());
  END IF;
END;
$$;

-- 5. Backfill existing orders with sequential numbers per tenant
DO $$
DECLARE
  t RECORD;
  o RECORD;
  counter INT;
BEGIN
  FOR t IN SELECT DISTINCT tenant_id FROM orders LOOP
    counter := 0;
    FOR o IN SELECT id FROM orders WHERE tenant_id = t.tenant_id ORDER BY created_at ASC LOOP
      counter := counter + 1;
      UPDATE orders SET
        order_number = counter,
        order_number_display = 'CMD-' || LPAD(counter::TEXT, 3, '0')
      WHERE id = o.id;
    END LOOP;
    -- Set the counter to the current max
    INSERT INTO order_counters (tenant_id, current_counter, updated_at)
    VALUES (t.tenant_id, counter, now())
    ON CONFLICT (tenant_id) DO UPDATE
    SET current_counter = counter, updated_at = now();
  END LOOP;
END;
$$;
