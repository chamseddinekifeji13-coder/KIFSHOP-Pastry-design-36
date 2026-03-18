-- ============================================================
-- CRITICAL SECURITY FIX: Replace Permissive RLS Policies
-- ============================================================
-- This script fixes CRITICAL security vulnerabilities where RLS policies
-- were using USING (true), allowing users to access data from other tenants.
-- 
-- IMPACT: Prevents multi-tenant data leaks and GDPR violations
-- 
-- Table: clients
-- PROBLEM: Policy "clients_select_tenant" was using USING (true)
-- SOLUTION: Implement proper tenant isolation

-- 1. DROP PERMISSIVE POLICIES (clients table)
DROP POLICY IF EXISTS clients_select_tenant ON public.clients;
DROP POLICY IF EXISTS clients_insert_tenant ON public.clients;
DROP POLICY IF EXISTS clients_update_tenant ON public.clients;
DROP POLICY IF EXISTS clients_delete_tenant ON public.clients;

-- 2. CREATE SECURE POLICIES (clients table)
CREATE POLICY clients_select_tenant
  ON public.clients FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY clients_insert_tenant
  ON public.clients FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY clients_update_tenant
  ON public.clients FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY clients_delete_tenant
  ON public.clients FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- 3. FIX quick_orders table (same issues)
DROP POLICY IF EXISTS quick_orders_select ON public.quick_orders;
DROP POLICY IF EXISTS quick_orders_insert ON public.quick_orders;
DROP POLICY IF EXISTS quick_orders_update ON public.quick_orders;
DROP POLICY IF EXISTS quick_orders_delete ON public.quick_orders;

CREATE POLICY quick_orders_select
  ON public.quick_orders FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY quick_orders_insert
  ON public.quick_orders FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY quick_orders_update
  ON public.quick_orders FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY quick_orders_delete
  ON public.quick_orders FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- 4. FIX best_delivery_config table
DROP POLICY IF EXISTS best_delivery_config_select ON public.best_delivery_config;
DROP POLICY IF EXISTS best_delivery_config_insert ON public.best_delivery_config;
DROP POLICY IF EXISTS best_delivery_config_update ON public.best_delivery_config;
DROP POLICY IF EXISTS best_delivery_config_delete ON public.best_delivery_config;

CREATE POLICY best_delivery_config_select
  ON public.best_delivery_config FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY best_delivery_config_insert
  ON public.best_delivery_config FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY best_delivery_config_update
  ON public.best_delivery_config FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY best_delivery_config_delete
  ON public.best_delivery_config FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- 5. FIX best_delivery_shipments table
DROP POLICY IF EXISTS best_delivery_shipments_select ON public.best_delivery_shipments;
DROP POLICY IF EXISTS best_delivery_shipments_insert ON public.best_delivery_shipments;
DROP POLICY IF EXISTS best_delivery_shipments_update ON public.best_delivery_shipments;
DROP POLICY IF EXISTS best_delivery_shipments_delete ON public.best_delivery_shipments;

CREATE POLICY best_delivery_shipments_select
  ON public.best_delivery_shipments FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY best_delivery_shipments_insert
  ON public.best_delivery_shipments FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY best_delivery_shipments_update
  ON public.best_delivery_shipments FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY best_delivery_shipments_delete
  ON public.best_delivery_shipments FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- 6. FIX support_tickets table
DROP POLICY IF EXISTS support_tickets_select ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_insert ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_update ON public.support_tickets;
DROP POLICY IF EXISTS support_tickets_delete ON public.support_tickets;

CREATE POLICY support_tickets_select
  ON public.support_tickets FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY support_tickets_insert
  ON public.support_tickets FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY support_tickets_update
  ON public.support_tickets FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY support_tickets_delete
  ON public.support_tickets FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- 7. FIX sales_channels table
DROP POLICY IF EXISTS sales_channels_select ON public.sales_channels;
DROP POLICY IF EXISTS sales_channels_insert ON public.sales_channels;
DROP POLICY IF EXISTS sales_channels_update ON public.sales_channels;
DROP POLICY IF EXISTS sales_channels_delete ON public.sales_channels;

CREATE POLICY sales_channels_select
  ON public.sales_channels FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY sales_channels_insert
  ON public.sales_channels FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY sales_channels_update
  ON public.sales_channels FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY sales_channels_delete
  ON public.sales_channels FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- VERIFICATION: Run after applying this migration
-- ============================================================
-- SELECT tablename, policyname, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('clients', 'quick_orders', 'best_delivery_config', 'best_delivery_shipments', 'support_tickets', 'sales_channels')
-- ORDER BY tablename, policyname;
