-- =============================================
-- AUDIT FIX 003: Créer les tables métier manquantes
-- Problème: Tables suppliers, raw_materials, etc. manquent
-- =============================================

-- ============ SUPPLIERS (Fournisseurs) ============
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  products text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_tenant_access" ON public.suppliers FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(tenant_id, name);

-- ============ RAW MATERIALS (Matières premières) ============
CREATE TABLE IF NOT EXISTS public.raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  unit text NOT NULL DEFAULT 'kg',
  current_stock numeric(12,3) NOT NULL DEFAULT 0,
  min_stock numeric(12,3) NOT NULL DEFAULT 0,
  price_per_unit numeric(12,3) NOT NULL DEFAULT 0,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  storage_location_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "raw_materials_tenant_access" ON public.raw_materials FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_raw_materials_tenant ON public.raw_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_low_stock ON public.raw_materials(tenant_id) 
  WHERE current_stock < min_stock;

-- ============ PACKAGING (Emballages) ============
CREATE TABLE IF NOT EXISTS public.packaging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  unit text NOT NULL DEFAULT 'piece',
  current_stock numeric(12,3) NOT NULL DEFAULT 0,
  min_stock numeric(12,3) NOT NULL DEFAULT 0,
  price_per_unit numeric(12,3) NOT NULL DEFAULT 0,
  storage_location_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.packaging ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packaging_tenant_access" ON public.packaging FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_packaging_tenant ON public.packaging(tenant_id);

-- ============ FINISHED PRODUCTS (Produits finis) ============
CREATE TABLE IF NOT EXISTS public.finished_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category_id uuid,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'piece',
  current_stock numeric(12,3) NOT NULL DEFAULT 0,
  min_stock numeric(12,3) NOT NULL DEFAULT 0,
  selling_price numeric(12,3) NOT NULL DEFAULT 0,
  cost_price numeric(12,3) NOT NULL DEFAULT 0,
  packaging_cost numeric(12,3) DEFAULT 0,
  ingredient_cost numeric(12,3) DEFAULT 0,
  image_url text,
  weight text,
  is_published boolean DEFAULT false,
  storage_location_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.finished_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finished_products_tenant_access" ON public.finished_products FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_finished_products_tenant ON public.finished_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finished_products_low_stock ON public.finished_products(tenant_id)
  WHERE current_stock < min_stock;

-- ============ RECIPES (Recettes) ============
CREATE TABLE IF NOT EXISTS public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  finished_product_id uuid REFERENCES public.finished_products(id) ON DELETE SET NULL,
  yield_quantity numeric(12,3) NOT NULL,
  yield_unit text NOT NULL DEFAULT 'piece',
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_tenant_access" ON public.recipes FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_recipes_tenant ON public.recipes(tenant_id);

-- ============ RECIPE INGREDIENTS ============
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  quantity numeric(12,3) NOT NULL,
  unit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.recipe_ingredients(recipe_id);

-- ============ ORDERS (Commandes) ============
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_address text,
  items jsonb NOT NULL DEFAULT '[]',
  total numeric(12,3) NOT NULL DEFAULT 0,
  deposit numeric(12,3) DEFAULT 0,
  shipping_cost numeric(12,3) DEFAULT 0,
  status text NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en-preparation', 'pret', 'en-livraison', 'livre')),
  delivery_type text DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'delivery')),
  courier text,
  gouvernorat text,
  tracking_number text,
  source text DEFAULT 'comptoir' CHECK (source IN ('whatsapp', 'messenger', 'phone', 'web', 'instagram', 'tiktok', 'comptoir')),
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid', 'partial')),
  delivery_date date,
  estimated_delivery_at timestamptz,
  delivered_at timestamptz,
  delivery_address text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_tenant_access" ON public.orders FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(tenant_id, customer_phone);

-- ============ STOCK MOVEMENTS (Mouvements de stock) ============
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('raw_material', 'finished_product', 'packaging')),
  item_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out', 'transfer', 'adjustment', 'waste')),
  quantity numeric(12,3) NOT NULL,
  unit text NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_movements_tenant_access" ON public.stock_movements FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON public.stock_movements(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(tenant_id, item_type, item_id);
