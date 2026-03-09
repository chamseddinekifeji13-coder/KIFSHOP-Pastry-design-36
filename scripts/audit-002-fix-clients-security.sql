-- =============================================
-- AUDIT FIX 002: CRITICAL - Corriger clients & quick_orders
-- Problème 1: RLS utilise USING (true) = FAILLE SÉCURITÉ
-- Problème 2: clients.tenant_id est UUID, tenants.id est TEXT = INCOMPATIBILITÉ
-- =============================================

-- PHASE 1: Corriger le type de tenant_id dans clients (UUID → TEXT)
-- Créer table temporaire avec les bonnes conversions
CREATE TEMP TABLE clients_backup AS
SELECT
  id,
  tenant_id::text AS tenant_id_text,
  phone,
  name,
  status,
  return_count,
  total_orders,
  total_spent,
  notes,
  created_at,
  updated_at
FROM public.clients;

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS clients_select_tenant ON public.clients;
DROP POLICY IF EXISTS clients_insert_tenant ON public.clients;
DROP POLICY IF EXISTS clients_update_tenant ON public.clients;
DROP POLICY IF EXISTS clients_delete_tenant ON public.clients;

-- Supprimer les index
DROP INDEX IF EXISTS idx_clients_tenant_phone ON public.clients;
DROP INDEX IF EXISTS idx_clients_tenant_id ON public.clients;

-- Supprimer et recréer la table
DROP TABLE public.clients CASCADE;

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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

-- Restaurer les données avec les conversions
INSERT INTO public.clients
SELECT 
  id, tenant_id_text, phone, name, status, 
  return_count, total_orders, total_spent, notes, created_at, updated_at
FROM clients_backup;

-- Activer RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- PHASE 2: Créer les politiques RLS CORRECTES pour clients
CREATE POLICY "clients_select_own_tenant" ON public.clients
  FOR SELECT USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
  );

CREATE POLICY "clients_insert_own_tenant" ON public.clients
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
  );

CREATE POLICY "clients_update_own_tenant" ON public.clients
  FOR UPDATE USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
  );

CREATE POLICY "clients_delete_own_tenant" ON public.clients
  FOR DELETE USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
  );

-- Recréer les index
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON public.clients(tenant_id, phone);

-- PHASE 3: Corriger quick_orders (même problème)
CREATE TEMP TABLE quick_orders_backup AS
SELECT
  id,
  tenant_id::text AS tenant_id_text,
  client_id,
  phone,
  client_name,
  client_status,
  items,
  total,
  source,
  notes,
  status,
  created_by,
  created_at
FROM public.quick_orders;

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS quick_orders_select_tenant ON public.quick_orders;
DROP POLICY IF EXISTS quick_orders_insert_tenant ON public.quick_orders;
DROP POLICY IF EXISTS quick_orders_update_tenant ON public.quick_orders;

-- Supprimer les index
DROP INDEX IF EXISTS idx_quick_orders_tenant ON public.quick_orders;
DROP INDEX IF EXISTS idx_quick_orders_phone ON public.quick_orders;

-- Supprimer et recréer la table
DROP TABLE public.quick_orders CASCADE;

CREATE TABLE public.quick_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
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

-- Restaurer les données
INSERT INTO public.quick_orders
SELECT 
  id, tenant_id_text, client_id, phone, client_name, client_status,
  items, total, source, notes, status, created_by, created_at
FROM quick_orders_backup;

-- Activer RLS
ALTER TABLE public.quick_orders ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS CORRECTES pour quick_orders
CREATE POLICY "quick_orders_select_own_tenant" ON public.quick_orders
  FOR SELECT USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
  );

CREATE POLICY "quick_orders_insert_own_tenant" ON public.quick_orders
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
  );

CREATE POLICY "quick_orders_update_own_tenant" ON public.quick_orders
  FOR UPDATE USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
  );

CREATE POLICY "quick_orders_delete_own_tenant" ON public.quick_orders
  FOR DELETE USING (
    tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid())
  );

-- Recréer les index
CREATE INDEX IF NOT EXISTS idx_quick_orders_tenant ON public.quick_orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quick_orders_phone ON public.quick_orders(tenant_id, phone);
