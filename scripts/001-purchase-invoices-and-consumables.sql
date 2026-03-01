-- =============================================
-- Consumables (Consommables - not raw materials)
-- Must be created BEFORE purchase_invoice_items which references it
-- =============================================

CREATE TABLE IF NOT EXISTS consumables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',
  current_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  price_per_unit NUMERIC(12,3) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Purchase Invoices (Factures d'achat)
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  invoice_number TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,3) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,3) NOT NULL DEFAULT 0,
  total NUMERIC(12,3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'soumise', 'validee', 'rejetee')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  validated_by UUID REFERENCES auth.users(id),
  validated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase invoice line items
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  raw_material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  consumable_id UUID REFERENCES consumables(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'kg',
  unit_price NUMERIC(12,3) NOT NULL DEFAULT 0,
  total NUMERIC(12,3) NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL DEFAULT 'raw_material' CHECK (item_type IN ('raw_material', 'consumable', 'packaging', 'other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_consumables_tenant ON consumables(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_tenant ON purchase_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_invoice ON purchase_invoice_items(invoice_id);

-- Enable RLS
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consumables
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consumables' AND policyname = 'consumables_tenant_access') THEN
    CREATE POLICY consumables_tenant_access ON consumables FOR ALL USING (
      tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    );
  END IF;
END $$;

-- RLS Policies for purchase_invoices
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_invoices' AND policyname = 'purchase_invoices_tenant_access') THEN
    CREATE POLICY purchase_invoices_tenant_access ON purchase_invoices FOR ALL USING (
      tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    );
  END IF;
END $$;

-- RLS Policies for purchase_invoice_items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_invoice_items' AND policyname = 'purchase_invoice_items_access') THEN
    CREATE POLICY purchase_invoice_items_access ON purchase_invoice_items FOR ALL USING (
      invoice_id IN (SELECT id FROM purchase_invoices WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
    );
  END IF;
END $$;
