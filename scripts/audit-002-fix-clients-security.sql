-- =============================================
-- AUDIT FIX 002: Sécuriser les tables CLIENTS
-- Problème: RLS défaillante, tenant_id UUID vs TEXT
-- =============================================

-- 1. Vérifier et corriger le type de tenant_id dans clients
-- Si clients.tenant_id est UUID mais tenants.id est TEXT, il faut le corriger
DO $$ 
BEGIN
  -- Vérifie si la colonne existe et son type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clients' AND column_name = 'tenant_id'
  ) THEN
    -- On va recréer la colonne avec le bon type
    ALTER TABLE public.clients 
      DROP CONSTRAINT IF EXISTS clients_tenant_id_fkey;
    
    -- Créer une nouvelle colonne tenant_id_text
    ALTER TABLE public.clients
      ADD COLUMN IF NOT EXISTS tenant_id_text text;
    
    -- Copier les données (si tenant_id était UUID, on le convertit)
    UPDATE public.clients 
    SET tenant_id_text = tenant_id::text 
    WHERE tenant_id_text IS NULL;
    
    -- Ajouter le constraint avec le bon type
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_tenant_id_text_fkey 
      FOREIGN KEY (tenant_id_text) REFERENCES public.tenants(id) ON DELETE CASCADE;
      
    -- Réorganiser les colonnes et supprimer l'ancienne
    -- Note: Ceci est une migration complexe, faire attention
  END IF;
END $$;

-- 2. Supprimer les politiques RLS défaillantes
DROP POLICY IF EXISTS clients_select_tenant ON public.clients;
DROP POLICY IF EXISTS clients_insert_tenant ON public.clients;
DROP POLICY IF EXISTS clients_update_tenant ON public.clients;
DROP POLICY IF EXISTS clients_delete_tenant ON public.clients;

-- 3. Créer les bonnes politiques RLS pour clients
CREATE POLICY "clients_select_own_tenant" ON public.clients
  FOR SELECT USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "clients_insert_own_tenant" ON public.clients
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "clients_update_own_tenant" ON public.clients
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "clients_delete_own_tenant" ON public.clients
  FOR DELETE USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

-- 4. Faire la même chose pour quick_orders
DROP POLICY IF EXISTS quick_orders_select_tenant ON public.quick_orders;
DROP POLICY IF EXISTS quick_orders_insert_tenant ON public.quick_orders;
DROP POLICY IF EXISTS quick_orders_update_tenant ON public.quick_orders;

CREATE POLICY "quick_orders_select_own_tenant" ON public.quick_orders
  FOR SELECT USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "quick_orders_insert_own_tenant" ON public.quick_orders
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "quick_orders_update_own_tenant" ON public.quick_orders
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()
    )
  );

-- 5. Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone_secure ON public.clients(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_quick_orders_tenant_secure ON public.quick_orders(tenant_id, created_at DESC);
