-- Create transactions table without external dependencies
-- This is a minimal table that doesn't rely on other tables existing

BEGIN;

-- Drop existing table and policies if they exist (use CASCADE to handle dependencies)
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Create the minimal transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  type TEXT,
  amount NUMERIC,
  category TEXT,
  payment_method TEXT DEFAULT 'cash',
  reference TEXT,
  description TEXT,
  order_id TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_transactions_tenant_id ON public.transactions(tenant_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON public.transactions(type);

COMMIT;



