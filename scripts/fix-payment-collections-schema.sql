-- =============================================
-- FIX: Payment Collections Table Schema
-- Create table and add missing columns/relationships
-- =============================================

BEGIN;

-- 1. Create payment_collections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.payment_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount DECIMAL(12,3) NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  collected_by TEXT,
  collector_name TEXT,
  reference TEXT,
  notes TEXT,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID,
  recorded_by_name TEXT,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by_name TEXT
);

-- 2. Add missing columns if table already exists
ALTER TABLE public.payment_collections
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS order_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS amount DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS collected_by TEXT,
  ADD COLUMN IF NOT EXISTS collector_name TEXT,
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS recorded_by UUID,
  ADD COLUMN IF NOT EXISTS recorded_by_name TEXT,
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_by_name TEXT;

-- 3. Clean up orphaned payment_collections records
DELETE FROM public.payment_collections
WHERE order_id NOT IN (SELECT id FROM public.orders);

-- 4. Add foreign key relationship to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_collections_order_id_fkey'
      AND conrelid = 'public.payment_collections'::regclass
  ) THEN
    ALTER TABLE public.payment_collections
      ADD CONSTRAINT payment_collections_order_id_fkey
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_collections_order_id ON public.payment_collections(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_collections_tenant_id ON public.payment_collections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_collections_collected_at ON public.payment_collections(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_collections_verified ON public.payment_collections(verified);
CREATE INDEX IF NOT EXISTS idx_payment_collections_collected_by ON public.payment_collections(collected_by);

-- 6. Enable RLS if not already enabled
ALTER TABLE public.payment_collections ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
DROP POLICY IF EXISTS payment_collections_tenant_access ON public.payment_collections;
CREATE POLICY "payment_collections_tenant_access" ON public.payment_collections FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

COMMIT;
