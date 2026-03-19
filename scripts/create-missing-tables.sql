-- ============================================================
-- CREATE MISSING BUSINESS TABLES FOR KIFSHOP PASTRY
-- ============================================================
-- These tables are critical for the business logic but are missing

-- TABLE 1: suppliers (Fournisseurs)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select
  ON public.suppliers FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY suppliers_insert
  ON public.suppliers FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY suppliers_update
  ON public.suppliers FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY suppliers_delete
  ON public.suppliers FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- TABLE 2: raw_materials (Matières premières)
CREATE TABLE IF NOT EXISTS public.raw_materials (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL, -- kg, L, pieces, etc.
  supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
  cost_per_unit DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY raw_materials_select
  ON public.raw_materials FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY raw_materials_insert
  ON public.raw_materials FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY raw_materials_update
  ON public.raw_materials FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY raw_materials_delete
  ON public.raw_materials FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- TABLE 3: packaging (Emballages)
CREATE TABLE IF NOT EXISTS public.packaging (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  size TEXT, -- Small, Medium, Large, etc.
  unit_cost DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.packaging ENABLE ROW LEVEL SECURITY;

CREATE POLICY packaging_select
  ON public.packaging FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY packaging_insert
  ON public.packaging FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY packaging_update
  ON public.packaging FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY packaging_delete
  ON public.packaging FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- TABLE 4: finished_products (Produits finis)
CREATE TABLE IF NOT EXISTS public.finished_products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE,
  category TEXT, -- Cakes, Pastries, Breads, etc.
  unit_price DECIMAL(10,2) NOT NULL,
  packaging_id TEXT REFERENCES public.packaging(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, sku)
);

ALTER TABLE public.finished_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY finished_products_select
  ON public.finished_products FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY finished_products_insert
  ON public.finished_products FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY finished_products_update
  ON public.finished_products FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY finished_products_delete
  ON public.finished_products FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- TABLE 5: recipes (Recettes)
CREATE TABLE IF NOT EXISTS public.recipes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  finished_product_id TEXT NOT NULL REFERENCES public.finished_products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  yield_quantity DECIMAL(10,2), -- Quantity produced by recipe
  yield_unit TEXT, -- pieces, kg, L, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, finished_product_id)
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY recipes_select
  ON public.recipes FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY recipes_insert
  ON public.recipes FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY recipes_update
  ON public.recipes FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY recipes_delete
  ON public.recipes FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- TABLE 6: recipe_ingredients (Ingrédients des recettes)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  recipe_id TEXT NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  raw_material_id TEXT NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  -- unit is taken from raw_materials.unit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recipe_id, raw_material_id)
);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- RLS for recipe_ingredients is based on recipe's tenant_id
CREATE POLICY recipe_ingredients_select
  ON public.recipe_ingredients FOR SELECT
  USING (
    recipe_id IN (
      SELECT id FROM public.recipes 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY recipe_ingredients_insert
  ON public.recipe_ingredients FOR INSERT
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM public.recipes 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY recipe_ingredients_update
  ON public.recipe_ingredients FOR UPDATE
  USING (
    recipe_id IN (
      SELECT id FROM public.recipes 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    recipe_id IN (
      SELECT id FROM public.recipes 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY recipe_ingredients_delete
  ON public.recipe_ingredients FOR DELETE
  USING (
    recipe_id IN (
      SELECT id FROM public.recipes 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

-- TABLE 7: orders (Commandes)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  delivery_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, ready, delivered, cancelled
  total_amount DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select
  ON public.orders FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY orders_insert
  ON public.orders FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY orders_update
  ON public.orders FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY orders_delete
  ON public.orders FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- TABLE 8: order_items (Articles des commandes)
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  finished_product_id TEXT NOT NULL REFERENCES public.finished_products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL, -- quantity * unit_price
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_items_select
  ON public.order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY order_items_insert
  ON public.order_items FOR INSERT
  WITH CHECK (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
    )
  );

-- TABLE 9: stock_movements (Mouvements de stock)
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  material_id TEXT NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- in, out, adjustment, production_use
  quantity DECIMAL(10,2) NOT NULL,
  reference_id TEXT, -- Order ID, Production ID, etc.
  reference_type TEXT, -- order, production, adjustment, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_movements_select
  ON public.stock_movements FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY stock_movements_insert
  ON public.stock_movements FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_tenant_id ON public.raw_materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_finished_products_tenant_id ON public.finished_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_tenant_id ON public.recipes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON public.stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material_id ON public.stock_movements(material_id);
