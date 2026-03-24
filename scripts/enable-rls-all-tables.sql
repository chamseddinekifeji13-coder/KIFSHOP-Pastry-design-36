-- Enable RLS on all critical tables with existing policies
-- This ensures data is properly filtered by tenant_id

-- 1. Enable RLS on stock_by_location
ALTER TABLE public.stock_by_location ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on cash_closures
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on cash_sessions
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. Enable RLS on orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 6. Enable RLS on finished_products
ALTER TABLE public.finished_products ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename AND schemaname = 'public') as policy_count
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('stock_by_location', 'cash_closures', 'cash_sessions', 'clients', 'orders', 'finished_products')
ORDER BY tablename;
