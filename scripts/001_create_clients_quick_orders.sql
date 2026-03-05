-- ============================================================
-- KIFSHOP: Clients table + Quick Orders table
-- ============================================================

-- 1. Clients table: phone = identity
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'vip', 'warning', 'blacklisted')),
  return_count INT NOT NULL DEFAULT 0,
  total_orders INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(12,3) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

-- 2. Quick Orders table: ultra-fast 6s order creation
CREATE TABLE IF NOT EXISTS public.quick_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  client_name TEXT,
  client_status TEXT DEFAULT 'normal',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC(12,3) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'comptoir',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'nouveau',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_orders ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for clients
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'clients_select_tenant') THEN
    CREATE POLICY clients_select_tenant ON public.clients FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'clients_insert_tenant') THEN
    CREATE POLICY clients_insert_tenant ON public.clients FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'clients_update_tenant') THEN
    CREATE POLICY clients_update_tenant ON public.clients FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'clients_delete_tenant') THEN
    CREATE POLICY clients_delete_tenant ON public.clients FOR DELETE USING (true);
  END IF;
END $$;

-- 5. RLS policies for quick_orders
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quick_orders' AND policyname = 'quick_orders_select_tenant') THEN
    CREATE POLICY quick_orders_select_tenant ON public.quick_orders FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quick_orders' AND policyname = 'quick_orders_insert_tenant') THEN
    CREATE POLICY quick_orders_insert_tenant ON public.quick_orders FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quick_orders' AND policyname = 'quick_orders_update_tenant') THEN
    CREATE POLICY quick_orders_update_tenant ON public.quick_orders FOR UPDATE USING (true);
  END IF;
END $$;

-- 6. Index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON public.clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_quick_orders_tenant ON public.quick_orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_orders_phone ON public.quick_orders(tenant_id, phone);
