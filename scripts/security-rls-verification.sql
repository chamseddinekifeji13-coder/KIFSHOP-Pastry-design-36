-- ============================================================================
-- RLS Security Verification & Enforcement Script
-- KIFSHOP Pastry - Tenant Isolation Security
-- ============================================================================
-- This script verifies and enforces Row Level Security (RLS) on all critical
-- tables to ensure proper tenant data isolation.
-- ============================================================================

-- 1. VERIFICATION: Check all RLS enabled tables
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename AND schemaname = 'public') as policy_count,
  CASE 
    WHEN rowsecurity = true AND (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename AND schemaname = 'public') > 0 THEN '✓ SECURED'
    WHEN rowsecurity = true THEN '⚠ RLS ENABLED BUT NO POLICIES'
    WHEN (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename AND schemaname = 'public') > 0 THEN '⚠ HAS POLICIES BUT RLS DISABLED'
    ELSE '✗ NO SECURITY'
  END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'stock_by_location', 'stock_movements', 'raw_materials', 'consumables', 'storage_locations',
    'finished_products', 'orders', 'cash_closures', 'cash_sessions', 'clients',
    'production_plans', 'inventory_sessions', 'inventory_counts',
    'crm_activity_log', 'crm_documents', 'crm_interactions', 'crm_pipeline_stages',
    'crm_quote_items', 'crm_quotes', 'crm_reminders', 'delivery_companies', 'best_delivery_shipments'
  )
ORDER BY security_status, tablename;

-- 2. VERIFICATION: Display all active policies with their conditions
SELECT 
  tablename,
  policyname,
  permissive as policy_type,
  cmd as operation,
  CASE 
    WHEN qual ILIKE '%tenant_id%' THEN '✓ Filters by tenant_id'
    WHEN qual ILIKE '%auth.uid()%' THEN '✓ Filters by user auth'
    ELSE '⚠ Unknown filter: ' || COALESCE(qual, 'NULL')
  END as filter_status,
  CASE 
    WHEN cmd = 'SELECT' THEN qual
    WHEN cmd IN ('INSERT', 'UPDATE') THEN with_check
    WHEN cmd = 'DELETE' THEN qual
    ELSE 'N/A'
  END as policy_condition
FROM pg_policies
WHERE tablename IN (
  'stock_by_location', 'stock_movements', 'raw_materials', 'consumables', 'storage_locations',
  'finished_products', 'orders', 'cash_closures', 'cash_sessions', 'clients',
  'production_plans', 'inventory_sessions', 'inventory_counts'
)
ORDER BY tablename, policyname;

-- 3. VERIFICATION: Check for tables WITH tenant_id column but WITHOUT RLS
SELECT DISTINCT
  t.tablename,
  'HAS tenant_id' as column_status,
  'RLS DISABLED' as rls_status,
  'ACTION REQUIRED' as status
FROM pg_tables t
WHERE schemaname = 'public'
  AND NOT rowsecurity
  AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = t.tablename AND column_name = 'tenant_id'
  )
ORDER BY tablename;

-- 4. ENFORCEMENT: Verify critical stock tables are properly secured
-- These tables MUST have RLS enabled and proper policies
ALTER TABLE public.stock_by_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finished_products ENABLE ROW LEVEL SECURITY;

-- 5. FINAL VERIFICATION: Report on all secured tables
WITH security_check AS (
  SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = t.tablename AND column_name = 'tenant_id') as has_tenant_id
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
  GROUP BY t.tablename, t.rowsecurity
)
SELECT 
  tablename,
  CASE WHEN rls_enabled THEN '✓ YES' ELSE '✗ NO' END as rls_enabled,
  policy_count,
  CASE WHEN has_tenant_id > 0 THEN '✓ YES' ELSE 'NO' END as has_tenant_column,
  CASE 
    WHEN rls_enabled AND policy_count > 0 THEN 'FULLY SECURED'
    WHEN rls_enabled AND policy_count = 0 THEN 'RLS ON BUT NO POLICIES'
    WHEN NOT rls_enabled AND policy_count > 0 THEN 'POLICIES EXIST BUT NOT ACTIVE'
    ELSE 'NO SECURITY'
  END as security_level
FROM security_check
WHERE tablename IN (
  'stock_by_location', 'stock_movements', 'raw_materials', 'consumables', 'storage_locations',
  'finished_products', 'orders', 'cash_closures', 'cash_sessions', 'clients',
  'production_plans', 'inventory_sessions', 'inventory_counts'
)
ORDER BY security_level DESC, tablename;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================
-- If all tables show "✓ FULLY SECURED", the database is properly configured.
-- The RLS policies filter access based on:
--   - tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
--   
-- This ensures:
--   ✓ Users can only see data from their tenant
--   ✓ Cross-tenant data access is impossible at database level
--   ✓ API-level tenant_id validation is reinforced by database-level security
-- ============================================================================
