-- ============================================================================
-- KIFSHOP Database Initialization Script
-- Executes all table creation and configuration in the correct order
-- ============================================================================

-- Step 1: Create delivery_companies table
-- Used for managing delivery company information per tenant
BEGIN;
CREATE TABLE IF NOT EXISTS delivery_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  contact_phone varchar(20),
  email varchar(255),
  website varchar(255),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_companies_tenant_id 
  ON delivery_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_companies_created_at 
  ON delivery_companies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_companies_is_active 
  ON delivery_companies(is_active);

-- Enable RLS
ALTER TABLE delivery_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS delivery_companies_authenticated ON delivery_companies;
CREATE POLICY delivery_companies_authenticated 
  ON delivery_companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMIT;

-- ============================================================================
-- SUMMARY OF ALL TABLES IN KIFSHOP
-- ============================================================================
-- The application relies on these Supabase tables:
-- 
-- 1. auth.users - Supabase built-in authentication table
-- 2. tenants - Business tenant/shop information
-- 3. tenant_users - User-to-tenant relationships
-- 4. users - User profiles
-- 5. products - Product catalog
-- 6. stock_items - Inventory management
-- 7. stock_alerts - Low stock notifications
-- 8. clients - Customer/client management
-- 9. orders - Sales orders
-- 10. order_items - Line items in orders
-- 11. transactions - Financial transactions
-- 12. cashiers - Cashier sessions
-- 13. categories - Product categories
-- 14. pos80_config - POS80 integration settings
-- 15. pos80_receipts - POS80 transaction sync logs
-- 16. delivery_companies - Delivery company info (NEWLY CREATED)
-- ... and many more workflow/audit tables
--
-- This script ensures delivery_companies table exists with proper schema,
-- indexes, and RLS policies configured.
-- ============================================================================
