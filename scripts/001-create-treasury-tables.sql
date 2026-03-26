-- Create all necessary treasury tables
-- This script creates: transactions, cash_sessions, order_collections, cash_closures

BEGIN;

-- 1. Create transactions table
DROP TABLE IF EXISTS public.transactions CASCADE;
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  category TEXT,
  amount DECIMAL(12,3) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  created_by TEXT,
  created_by_name TEXT,
  cash_session_id TEXT,
  order_id TEXT,
  is_collection BOOLEAN DEFAULT false,
  description TEXT,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_cash_session_id ON public.transactions(cash_session_id);
CREATE INDEX idx_transactions_order_id ON public.transactions(order_id);

-- 2. Create cash_sessions table
DROP TABLE IF EXISTS public.cash_sessions CASCADE;
CREATE TABLE public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  opened_by TEXT,
  opened_by_name TEXT,
  closed_by TEXT,
  closed_by_name TEXT,
  opening_balance DECIMAL(12,3) DEFAULT 0,
  closing_balance DECIMAL(12,3),
  expected_balance DECIMAL(12,3),
  difference DECIMAL(12,3),
  difference_reason TEXT,
  status TEXT DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_cash_sessions_tenant_id ON public.cash_sessions(tenant_id);
CREATE INDEX idx_cash_sessions_status ON public.cash_sessions(status);
CREATE INDEX idx_cash_sessions_opened_at ON public.cash_sessions(opened_at DESC);

-- 3. Create order_collections table
DROP TABLE IF EXISTS public.order_collections CASCADE;
CREATE TABLE public.order_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  cash_session_id UUID REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  amount DECIMAL(12,3) NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  collected_by TEXT,
  collected_by_name TEXT,
  notes TEXT,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_collections_tenant_id ON public.order_collections(tenant_id);
CREATE INDEX idx_order_collections_order_id ON public.order_collections(order_id);
CREATE INDEX idx_order_collections_collected_at ON public.order_collections(collected_at DESC);

-- 4. Create cash_closures table
DROP TABLE IF EXISTS public.cash_closures CASCADE;
CREATE TABLE public.cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  closure_date DATE NOT NULL,
  closed_by TEXT,
  closed_by_name TEXT,
  total_sales DECIMAL(12,3) DEFAULT 0,
  total_collections DECIMAL(12,3) DEFAULT 0,
  total_cash_income DECIMAL(12,3) DEFAULT 0,
  total_card_income DECIMAL(12,3) DEFAULT 0,
  total_other_income DECIMAL(12,3) DEFAULT 0,
  total_expenses DECIMAL(12,3) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  collections_count INTEGER DEFAULT 0,
  transactions_count INTEGER DEFAULT 0,
  opening_balance DECIMAL(12,3) DEFAULT 0,
  expected_closing DECIMAL(12,3),
  actual_closing DECIMAL(12,3),
  difference DECIMAL(12,3),
  difference_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cash_closures_tenant_id ON public.cash_closures(tenant_id);
CREATE INDEX idx_cash_closures_closure_date ON public.cash_closures(closure_date DESC);

-- Enable RLS on all tables (permissive for now)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies (allow all for now)
DROP POLICY IF EXISTS transactions_policy ON public.transactions;
CREATE POLICY transactions_policy ON public.transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cash_sessions_policy ON public.cash_sessions;
CREATE POLICY cash_sessions_policy ON public.cash_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS order_collections_policy ON public.order_collections;
CREATE POLICY order_collections_policy ON public.order_collections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cash_closures_policy ON public.cash_closures;
CREATE POLICY cash_closures_policy ON public.cash_closures FOR ALL USING (true) WITH CHECK (true);

COMMIT;
