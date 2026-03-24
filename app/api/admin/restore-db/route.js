import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// ===== AUDIT SCRIPTS =====
const auditScript001 = `
-- AUDIT FIX 001: Vérifier et corriger le schéma TENANTS
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_plan ON public.tenants(subscription_plan);
`;

const auditScript002 = `
-- AUDIT FIX 002: CRITICAL - Vérifier et corriger clients
-- Juste ajouter les colonnes manquantes si nécessaire
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS return_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent numeric(12,3) DEFAULT 0;

-- Fix RLS policies
DROP POLICY IF EXISTS clients_select_tenant ON public.clients;
DROP POLICY IF EXISTS clients_insert_tenant ON public.clients;
DROP POLICY IF EXISTS clients_update_tenant ON public.clients;

CREATE POLICY "clients_select_tenant" ON public.clients FOR SELECT
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "clients_insert_tenant" ON public.clients FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "clients_update_tenant" ON public.clients FOR UPDATE
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));
`;

const auditScript003 = `
-- AUDIT FIX 003: Créer les tables métier manquantes

-- SUPPLIERS (Fournisseurs)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "suppliers_tenant_access" ON public.suppliers FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);

-- RAW_MATERIALS (Matières premières)
CREATE TABLE IF NOT EXISTS public.raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  current_stock numeric(12,3) NOT NULL DEFAULT 0,
  min_stock numeric(12,3) NOT NULL DEFAULT 0,
  price_per_unit numeric(12,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "raw_materials_tenant_access" ON public.raw_materials FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_raw_materials_tenant ON public.raw_materials(tenant_id);
`;

const auditScript004 = `
-- AUDIT FIX 004: Sécuriser l'intégration Best Delivery

-- Fix RLS policies for best_delivery_trackings
DROP POLICY IF EXISTS best_delivery_trackings_select ON public.best_delivery_trackings;
DROP POLICY IF EXISTS best_delivery_trackings_insert ON public.best_delivery_trackings;

CREATE POLICY "best_delivery_trackings_select" ON public.best_delivery_trackings FOR SELECT
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE POLICY "best_delivery_trackings_insert" ON public.best_delivery_trackings FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role = 'admin'));
`;

const pos80Script001 = `
-- POS80 CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.pos80_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    api_key TEXT NOT NULL,
    api_secret TEXT NOT NULL,
    store_id TEXT NOT NULL,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id)
);

ALTER TABLE public.pos80_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "pos80_config_admin" ON public.pos80_config FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid() AND tu.role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_pos80_config_tenant ON public.pos80_config(tenant_id);
`;

const pos80Script002 = `
-- POS80 SYNC LOGS TABLE
CREATE TABLE IF NOT EXISTS public.pos80_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('products', 'orders', 'inventory', 'full')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'partial')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    records_synced INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pos80_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "pos80_sync_logs_access" ON public.pos80_sync_logs FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pos80_sync_logs_tenant ON public.pos80_sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos80_sync_logs_created_at ON public.pos80_sync_logs(created_at);
`;

const pos80Script003 = `
-- Add source column to orders if it doesn't exist
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' CHECK (source IN ('web', 'pos80', 'manual'));

-- Sales reconciliation table
CREATE TABLE IF NOT EXISTS public.sales_reconciliation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    reconciliation_date DATE NOT NULL,
    web_sales NUMERIC(12,3) DEFAULT 0,
    pos80_sales NUMERIC(12,3) DEFAULT 0,
    manual_sales NUMERIC(12,3) DEFAULT 0,
    discrepancy NUMERIC(12,3),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reconciled', 'flagged')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, reconciliation_date)
);

ALTER TABLE public.sales_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "sales_reconciliation_access" ON public.sales_reconciliation FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_sales_reconciliation_tenant ON public.sales_reconciliation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_reconciliation_date ON public.sales_reconciliation(reconciliation_date);
`;

export async function POST(request) {
  try {
    // Verify API key from environment
    const apiKey = request.headers.get('x-api-key')
    if (apiKey !== process.env.MIGRATION_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase credentials')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Execute migrations in order
    const scripts = [
      { name: 'audit-001-fix-tenants-schema', sql: auditScript001 },
      { name: 'audit-002-fix-clients-security', sql: auditScript002 },
      { name: 'audit-003-create-core-business-tables', sql: auditScript003 },
      { name: 'audit-004-fix-best-delivery-rls', sql: auditScript004 },
      { name: 'pos80-001-create-pos80-config', sql: pos80Script001 },
      { name: 'pos80-002-create-pos80-sync-logs', sql: pos80Script002 },
      { name: 'pos80-003-add-source-column', sql: pos80Script003 },
    ]

    const results = []

    for (const script of scripts) {
      try {
        console.log(`[v0] Executing ${script.name}...`)
        
        // Execute the SQL directly via Supabase admin client
        const { data, error } = await supabase.rpc('exec', { sql: script.sql })
        
        if (error) {
          console.error(`[v0] Error in ${script.name}:`, error)
          results.push({
            name: script.name,
            status: 'failed',
            error: error.message,
          })
        } else {
          console.log(`[v0] Successfully executed ${script.name}`)
          results.push({
            name: script.name,
            status: 'success',
          })
        }
      } catch (error) {
        console.error(`[v0] Exception in ${script.name}:`, error)
        results.push({
          name: script.name,
          status: 'failed',
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Migration process completed',
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[v0] Migration error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
