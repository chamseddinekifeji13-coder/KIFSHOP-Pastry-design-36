-- ============================================================================
-- DELIVERY EXPORT TABLES FOR API INTEGRATION
-- Tables pour l'exportation des commandes vers les sociétés de livraison via API
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Table: delivery_provider_credentials
-- Stocke les identifiants API pour chaque fournisseur de livraison par tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL, -- 'best_delivery', 'aramex', 'first_delivery', 'mydhl', 'fedex', etc.
  provider_name TEXT NOT NULL,
  
  -- Credentials API
  api_key TEXT,
  api_secret TEXT,
  account_number TEXT,
  account_pin TEXT,
  username TEXT,
  password TEXT,
  base_url TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  
  -- Configuration additionnelle
  extra_config JSONB DEFAULT '{}',
  
  -- Paramètres par défaut
  default_delivery_type TEXT DEFAULT 'standard', -- 'standard', 'express', 'same_day'
  default_payment_mode TEXT DEFAULT 'cod', -- 'cod', 'prepaid'
  auto_sync_enabled BOOLEAN DEFAULT false,
  sync_interval_minutes INTEGER DEFAULT 30,
  
  -- Statut
  is_enabled BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, provider_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_credentials_tenant ON delivery_provider_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_credentials_provider ON delivery_provider_credentials(provider_code);
CREATE INDEX IF NOT EXISTS idx_delivery_credentials_enabled ON delivery_provider_credentials(is_enabled);
CREATE INDEX IF NOT EXISTS idx_delivery_credentials_default ON delivery_provider_credentials(is_default);

-- ============================================================================
-- 2. Table: delivery_shipments
-- Historique de tous les envois exportés vers les fournisseurs de livraison
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  provider_code TEXT NOT NULL,
  
  -- Informations client
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_phone_2 TEXT,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  customer_city TEXT,
  customer_governorate TEXT,
  customer_postal_code TEXT,
  customer_country TEXT DEFAULT 'TN',
  
  -- Détails de livraison
  delivery_type TEXT DEFAULT 'standard', -- 'standard', 'express', 'same_day'
  package_type TEXT DEFAULT 'parcel', -- 'parcel', 'envelope', 'box', 'pallet'
  total_weight DECIMAL(10,3) DEFAULT 0,
  total_pieces INTEGER DEFAULT 1,
  dimensions JSONB, -- {length, width, height}
  items_description TEXT,
  special_instructions TEXT,
  
  -- Montants
  cod_amount DECIMAL(10,3) DEFAULT 0, -- Cash on Delivery
  declared_value DECIMAL(10,3) DEFAULT 0,
  shipping_cost DECIMAL(10,3) DEFAULT 0,
  insurance_amount DECIMAL(10,3) DEFAULT 0,
  
  -- Référencements fournisseur
  tracking_number TEXT,
  provider_shipment_id TEXT,
  awb_number TEXT, -- Air Waybill
  barcode TEXT,
  label_url TEXT,
  invoice_url TEXT,
  
  -- Statut de livraison
  status TEXT DEFAULT 'pending',
  -- Statuts possibles: pending, sent, picked_up, in_transit, out_for_delivery, 
  -- delivered, attempted, failed, returned, cancelled
  status_reason TEXT,
  
  -- Historique des statuts
  status_history JSONB DEFAULT '[]',
  
  -- Dates importantes
  exported_at TIMESTAMPTZ,
  picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  
  -- Réponses API
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Synchronisation
  last_sync_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'error'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, order_id, provider_code)
);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_shipments_tenant ON delivery_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON delivery_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_order_number ON delivery_shipments(order_number);
CREATE INDEX IF NOT EXISTS idx_shipments_provider ON delivery_shipments(provider_code);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON delivery_shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON delivery_shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_awb ON delivery_shipments(awb_number);
CREATE INDEX IF NOT EXISTS idx_shipments_exported_at ON delivery_shipments(exported_at);
CREATE INDEX IF NOT EXISTS idx_shipments_sync_status ON delivery_shipments(sync_status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON delivery_shipments(created_at DESC);

-- ============================================================================
-- 3. Table: delivery_shipment_items
-- Articles individuels dans chaque envoi
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_shipment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES delivery_shipments(id) ON DELETE CASCADE,
  product_id UUID,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,3) DEFAULT 0,
  total_price DECIMAL(10,3) DEFAULT 0,
  weight DECIMAL(10,3) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON delivery_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_product ON delivery_shipment_items(product_id);

-- ============================================================================
-- 4. Table: delivery_export_logs
-- Journal détaillé de toutes les opérations d'export API
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES delivery_shipments(id) ON DELETE SET NULL,
  provider_code TEXT NOT NULL,
  
  -- Type d'opération
  operation TEXT NOT NULL, -- 'create_shipment', 'track_shipment', 'cancel_shipment', 'update_status', 'sync_batch'
  
  -- Requête API
  request_url TEXT,
  request_method TEXT,
  request_headers JSONB,
  request_body JSONB,
  
  -- Réponse API
  response_status INTEGER,
  response_headers JSONB,
  response_body JSONB,
  
  -- Résultat
  success BOOLEAN DEFAULT false,
  error_code TEXT,
  error_message TEXT,
  
  -- Durée de l'appel
  duration_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_logs_tenant ON delivery_export_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_shipment ON delivery_export_logs(shipment_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_provider ON delivery_export_logs(provider_code);
CREATE INDEX IF NOT EXISTS idx_export_logs_operation ON delivery_export_logs(operation);
CREATE INDEX IF NOT EXISTS idx_export_logs_success ON delivery_export_logs(success);
CREATE INDEX IF NOT EXISTS idx_export_logs_created_at ON delivery_export_logs(created_at DESC);

-- ============================================================================
-- 5. Table: delivery_webhooks
-- Réception des webhooks des fournisseurs de livraison
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  
  -- Données du webhook
  event_type TEXT NOT NULL, -- 'status_update', 'delivery_confirmed', 'return_initiated', etc.
  tracking_number TEXT,
  shipment_id UUID REFERENCES delivery_shipments(id) ON DELETE SET NULL,
  
  -- Payload brut
  headers JSONB,
  payload JSONB NOT NULL,
  
  -- Traitement
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  
  -- Timestamps
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON delivery_webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_provider ON delivery_webhooks(provider_code);
CREATE INDEX IF NOT EXISTS idx_webhooks_tracking ON delivery_webhooks(tracking_number);
CREATE INDEX IF NOT EXISTS idx_webhooks_shipment ON delivery_webhooks(shipment_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON delivery_webhooks(processed);
CREATE INDEX IF NOT EXISTS idx_webhooks_received_at ON delivery_webhooks(received_at DESC);

-- ============================================================================
-- 6. Table: delivery_rates
-- Tarifs de livraison par zone et fournisseur
-- ============================================================================
CREATE TABLE IF NOT EXISTS delivery_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  
  -- Zone de livraison
  zone_name TEXT NOT NULL,
  governorates TEXT[], -- Liste des gouvernorats dans cette zone
  cities TEXT[], -- Liste des villes (optionnel)
  
  -- Tarifs
  base_rate DECIMAL(10,3) NOT NULL DEFAULT 0,
  rate_per_kg DECIMAL(10,3) DEFAULT 0,
  cod_fee DECIMAL(10,3) DEFAULT 0,
  cod_percentage DECIMAL(5,2) DEFAULT 0,
  express_surcharge DECIMAL(10,3) DEFAULT 0,
  same_day_surcharge DECIMAL(10,3) DEFAULT 0,
  
  -- Limites
  min_weight DECIMAL(10,3) DEFAULT 0,
  max_weight DECIMAL(10,3) DEFAULT 100,
  max_cod_amount DECIMAL(10,3) DEFAULT 10000,
  
  -- Délais estimés (en jours)
  estimated_days_min INTEGER DEFAULT 1,
  estimated_days_max INTEGER DEFAULT 3,
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, provider_code, zone_name)
);

CREATE INDEX IF NOT EXISTS idx_rates_tenant ON delivery_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rates_provider ON delivery_rates(provider_code);
CREATE INDEX IF NOT EXISTS idx_rates_active ON delivery_rates(is_active);

-- ============================================================================
-- 7. Fonctions utilitaires
-- ============================================================================

-- Fonction pour générer un numéro de suivi interne
CREATE OR REPLACE FUNCTION generate_tracking_reference(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_year TEXT;
  v_sequence INTEGER;
  v_reference TEXT;
BEGIN
  -- Obtenir le préfixe du tenant (2-3 premières lettres du nom)
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO v_prefix
  FROM tenants WHERE id = p_tenant_id;
  
  IF v_prefix IS NULL THEN
    v_prefix := 'KIF';
  END IF;
  
  -- Année courante
  v_year := TO_CHAR(NOW(), 'YY');
  
  -- Obtenir le prochain numéro de séquence
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(tracking_number, '^[A-Z]+-[0-9]+-', ''), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM delivery_shipments
  WHERE tenant_id = p_tenant_id
  AND tracking_number LIKE v_prefix || '-' || v_year || '-%';
  
  -- Construire la référence
  v_reference := v_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
  
  RETURN v_reference;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer le coût de livraison
CREATE OR REPLACE FUNCTION calculate_shipping_cost(
  p_tenant_id UUID,
  p_provider_code TEXT,
  p_governorate TEXT,
  p_weight DECIMAL,
  p_cod_amount DECIMAL,
  p_delivery_type TEXT DEFAULT 'standard'
)
RETURNS DECIMAL AS $$
DECLARE
  v_rate RECORD;
  v_cost DECIMAL := 0;
  v_cod_fee DECIMAL := 0;
BEGIN
  -- Trouver le tarif applicable
  SELECT * INTO v_rate
  FROM delivery_rates
  WHERE tenant_id = p_tenant_id
  AND provider_code = p_provider_code
  AND is_active = true
  AND p_governorate = ANY(governorates)
  LIMIT 1;
  
  IF v_rate IS NULL THEN
    -- Tarif par défaut si non trouvé
    RETURN 7.000; -- 7 TND par défaut
  END IF;
  
  -- Calcul du coût de base
  v_cost := v_rate.base_rate;
  
  -- Ajouter le coût par kg si applicable
  IF p_weight > v_rate.min_weight THEN
    v_cost := v_cost + ((p_weight - v_rate.min_weight) * v_rate.rate_per_kg);
  END IF;
  
  -- Ajouter les frais COD
  IF p_cod_amount > 0 THEN
    v_cod_fee := GREATEST(v_rate.cod_fee, p_cod_amount * v_rate.cod_percentage / 100);
    v_cost := v_cost + v_cod_fee;
  END IF;
  
  -- Ajouter les suppléments selon le type de livraison
  IF p_delivery_type = 'express' THEN
    v_cost := v_cost + v_rate.express_surcharge;
  ELSIF p_delivery_type = 'same_day' THEN
    v_cost := v_cost + v_rate.same_day_surcharge;
  END IF;
  
  RETURN v_cost;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le statut d'un envoi et historiser
CREATE OR REPLACE FUNCTION update_shipment_status(
  p_shipment_id UUID,
  p_status TEXT,
  p_status_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_status TEXT;
  v_history JSONB;
BEGIN
  -- Récupérer le statut actuel et l'historique
  SELECT status, COALESCE(status_history, '[]'::jsonb)
  INTO v_current_status, v_history
  FROM delivery_shipments
  WHERE id = p_shipment_id;
  
  -- Ajouter l'entrée à l'historique
  v_history := v_history || jsonb_build_object(
    'from_status', v_current_status,
    'to_status', p_status,
    'reason', p_status_reason,
    'timestamp', NOW()
  );
  
  -- Mettre à jour l'envoi
  UPDATE delivery_shipments
  SET 
    status = p_status,
    status_reason = p_status_reason,
    status_history = v_history,
    updated_at = NOW(),
    delivered_at = CASE WHEN p_status = 'delivered' THEN NOW() ELSE delivered_at END,
    returned_at = CASE WHEN p_status = 'returned' THEN NOW() ELSE returned_at END
  WHERE id = p_shipment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Triggers pour mise à jour automatique
-- ============================================================================

-- Trigger pour updated_at sur delivery_provider_credentials
CREATE OR REPLACE FUNCTION update_delivery_credentials_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_delivery_credentials_timestamp ON delivery_provider_credentials;
CREATE TRIGGER trigger_update_delivery_credentials_timestamp
  BEFORE UPDATE ON delivery_provider_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_credentials_timestamp();

-- Trigger pour updated_at sur delivery_shipments
DROP TRIGGER IF EXISTS trigger_update_delivery_shipments_timestamp ON delivery_shipments;
CREATE TRIGGER trigger_update_delivery_shipments_timestamp
  BEFORE UPDATE ON delivery_shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_credentials_timestamp();

-- Trigger pour updated_at sur delivery_rates
DROP TRIGGER IF EXISTS trigger_update_delivery_rates_timestamp ON delivery_rates;
CREATE TRIGGER trigger_update_delivery_rates_timestamp
  BEFORE UPDATE ON delivery_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_credentials_timestamp();

-- ============================================================================
-- 9. Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE delivery_provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "tenant_isolation_credentials" ON delivery_provider_credentials;
DROP POLICY IF EXISTS "tenant_isolation_shipments" ON delivery_shipments;
DROP POLICY IF EXISTS "tenant_isolation_shipment_items" ON delivery_shipment_items;
DROP POLICY IF EXISTS "tenant_isolation_export_logs" ON delivery_export_logs;
DROP POLICY IF EXISTS "tenant_isolation_webhooks" ON delivery_webhooks;
DROP POLICY IF EXISTS "tenant_isolation_rates" ON delivery_rates;

-- Create RLS policies for tenant isolation
CREATE POLICY "tenant_isolation_credentials" ON delivery_provider_credentials
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_isolation_shipments" ON delivery_shipments
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_isolation_shipment_items" ON delivery_shipment_items
  FOR ALL USING (
    shipment_id IN (
      SELECT id FROM delivery_shipments 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "tenant_isolation_export_logs" ON delivery_export_logs
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_isolation_webhooks" ON delivery_webhooks
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    OR tenant_id IS NULL -- Allow webhook reception before tenant identification
  );

CREATE POLICY "tenant_isolation_rates" ON delivery_rates
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- 10. Insérer les tarifs par défaut pour la Tunisie
-- ============================================================================

-- Cette partie sera exécutée par tenant lors de la configuration initiale
-- Exemple de zones pour Best Delivery en Tunisie:
-- Zone 1: Grand Tunis (Tunis, Ariana, Ben Arous, Manouba)
-- Zone 2: Cap Bon et Sahel (Nabeul, Sousse, Monastir, Mahdia)
-- Zone 3: Centre (Sfax, Kairouan, Sidi Bouzid, Kasserine, Gafsa)
-- Zone 4: Nord (Bizerte, Béja, Jendouba, Le Kef, Siliana, Zaghouan)
-- Zone 5: Sud (Gabès, Médenine, Tataouine, Tozeur, Kébili)

COMMIT;

-- ============================================================================
-- RÉSUMÉ DES TABLES CRÉÉES
-- ============================================================================
-- 
-- 1. delivery_provider_credentials - Identifiants API des fournisseurs
-- 2. delivery_shipments - Envois exportés vers les fournisseurs
-- 3. delivery_shipment_items - Articles dans chaque envoi
-- 4. delivery_export_logs - Journal des appels API
-- 5. delivery_webhooks - Webhooks reçus des fournisseurs
-- 6. delivery_rates - Tarifs par zone et fournisseur
--
-- FONCTIONS CRÉÉES:
-- - generate_tracking_reference() - Génère un numéro de suivi interne
-- - calculate_shipping_cost() - Calcule le coût de livraison
-- - update_shipment_status() - Met à jour le statut avec historisation
--
-- ============================================================================
