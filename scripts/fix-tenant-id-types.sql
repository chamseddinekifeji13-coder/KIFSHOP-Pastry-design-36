-- ============================================================
-- CRITICAL FIX: Convert tenant_id from UUID to TEXT
-- ============================================================
-- Problem: tenants.id is TEXT, but many tables use UUID for tenant_id
-- This causes foreign key constraint violations
--
-- Solution: Convert all tenant_id columns from UUID to TEXT
-- ============================================================

-- STEP 1: Drop foreign key constraints that reference tenants(id)
-- (Supabase automatically manages these, but we need to verify)

-- STEP 2: Convert tenant_id type in each table

-- 2.1 clients table
ALTER TABLE public.clients
  ALTER COLUMN tenant_id TYPE TEXT;

-- 2.2 quick_orders table
ALTER TABLE public.quick_orders
  ALTER COLUMN tenant_id TYPE TEXT;

-- 2.3 consumables table (if it has tenant_id)
ALTER TABLE public.consumables
  ALTER COLUMN tenant_id TYPE TEXT;

-- 2.4 purchase_invoices table
ALTER TABLE public.purchase_invoices
  ALTER COLUMN tenant_id TYPE TEXT;

-- 2.5 best_delivery_config table
ALTER TABLE public.best_delivery_config
  ALTER COLUMN tenant_id TYPE TEXT;

-- 2.6 best_delivery_shipments table
ALTER TABLE public.best_delivery_shipments
  ALTER COLUMN tenant_id TYPE TEXT;

-- 2.7 support_tickets table
ALTER TABLE public.support_tickets
  ALTER COLUMN tenant_id TYPE TEXT;

-- 2.8 sales_channels table
ALTER TABLE public.sales_channels
  ALTER COLUMN tenant_id TYPE TEXT;

-- STEP 3: Verify conversions
-- Run this to check if all conversions succeeded:
/*
SELECT 
  t.table_name,
  c.column_name,
  c.udt_name as data_type,
  c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE c.column_name = 'tenant_id'
  AND t.table_schema = 'public'
ORDER BY t.table_name;
*/

-- STEP 4: Update any hardcoded UUID values in code
-- Search for: uuid.UUID or UUID( patterns in your TypeScript code
-- These should now be treated as TEXT strings

-- ============================================================
-- VALIDATION QUERIES (Run after migration)
-- ============================================================

-- Check all tenant_id columns are now TEXT:
-- SELECT tablename, attname, typname 
-- FROM pg_class c
-- JOIN pg_attribute a ON a.attrelid = c.oid
-- JOIN pg_type t ON t.oid = a.atttypid
-- WHERE relname IN ('clients', 'quick_orders', 'consumables', 'purchase_invoices')
--   AND attname = 'tenant_id';

-- Check foreign key constraints are working:
-- INSERT INTO public.clients (tenant_id, name, phone) 
-- VALUES ('valid-tenant-id', 'Test', '123456789');
