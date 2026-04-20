-- CRM Tables for KIFSHOP Commercial Platform
-- This script creates all the tables needed for the CRM functionality

-- =====================================================
-- 1. CRM Interactions (Historique des echanges)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES platform_prospects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'demo', 'whatsapp', 'note', 'other')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  content TEXT,
  duration_minutes INTEGER,
  outcome TEXT,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_crm_interactions_prospect ON crm_interactions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_type ON crm_interactions(type);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_created_at ON crm_interactions(created_at DESC);

-- =====================================================
-- 2. CRM Reminders (Rappels et relances)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES platform_prospects(id) ON DELETE CASCADE,
  interaction_id UUID REFERENCES crm_interactions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  reminder_date TIMESTAMPTZ NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('call', 'email', 'meeting', 'follow_up', 'demo', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'snoozed')),
  completed_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_reminders_prospect ON crm_reminders(prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_date ON crm_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_status ON crm_reminders(status);
CREATE INDEX IF NOT EXISTS idx_crm_reminders_assigned ON crm_reminders(assigned_to);

-- =====================================================
-- 3. CRM Quotes (Devis et propositions commerciales)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  prospect_id UUID NOT NULL REFERENCES platform_prospects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'negotiating')),
  valid_until DATE,
  subtotal DECIMAL(12, 3) DEFAULT 0,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 3) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 19,
  tax_amount DECIMAL(12, 3) DEFAULT 0,
  total DECIMAL(12, 3) DEFAULT 0,
  currency TEXT DEFAULT 'TND',
  payment_terms TEXT,
  notes TEXT,
  terms_conditions TEXT,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_quotes_prospect ON crm_quotes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_status ON crm_quotes(status);
CREATE INDEX IF NOT EXISTS idx_crm_quotes_number ON crm_quotes(quote_number);

-- =====================================================
-- 4. CRM Quote Items (Lignes de devis)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES crm_quotes(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(12, 3) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  total DECIMAL(12, 3) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_crm_quote_items_quote ON crm_quote_items(quote_id);

-- =====================================================
-- 5. CRM Pipeline Stages (Etapes du pipeline commercial)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
  sort_order INTEGER DEFAULT 0,
  is_won BOOLEAN DEFAULT FALSE,
  is_lost BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pipeline stages
INSERT INTO crm_pipeline_stages (name, description, color, probability, sort_order, is_won, is_lost) VALUES
  ('Nouveau', 'Prospect nouvellement identifie', '#6B7280', 10, 1, false, false),
  ('Contact', 'Premier contact etabli', '#3B82F6', 20, 2, false, false),
  ('Qualification', 'Besoins identifies et qualifies', '#8B5CF6', 30, 3, false, false),
  ('Demo', 'Demonstration programmee ou effectuee', '#F59E0B', 50, 4, false, false),
  ('Proposition', 'Devis envoye', '#EC4899', 70, 5, false, false),
  ('Negociation', 'En cours de negociation', '#F97316', 80, 6, false, false),
  ('Gagne', 'Client converti', '#10B981', 100, 7, true, false),
  ('Perdu', 'Opportunite perdue', '#EF4444', 0, 8, false, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. CRM Documents (Documents attaches)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES platform_prospects(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES crm_quotes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT CHECK (category IN ('quote', 'contract', 'presentation', 'brochure', 'other')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_crm_documents_prospect ON crm_documents(prospect_id);

-- =====================================================
-- 7. Add pipeline_stage_id to prospects table
-- =====================================================
ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS pipeline_stage_id UUID REFERENCES crm_pipeline_stages(id);

ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS expected_value DECIMAL(12, 3);

ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS expected_close_date DATE;

ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS lost_reason TEXT;

ALTER TABLE prospects 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- =====================================================
-- 8. CRM Activity Log (Journal d'activite automatique)
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES platform_prospects(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_crm_activity_prospect ON crm_activity_log(prospect_id);
CREATE INDEX IF NOT EXISTS idx_crm_activity_created ON crm_activity_log(created_at DESC);

-- =====================================================
-- Update timestamp trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_crm_interactions_updated_at ON crm_interactions;
CREATE TRIGGER update_crm_interactions_updated_at
  BEFORE UPDATE ON crm_interactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_reminders_updated_at ON crm_reminders;
CREATE TRIGGER update_crm_reminders_updated_at
  BEFORE UPDATE ON crm_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_quotes_updated_at ON crm_quotes;
CREATE TRIGGER update_crm_quotes_updated_at
  BEFORE UPDATE ON crm_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
