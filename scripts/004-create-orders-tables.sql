-- ============================================================
-- KIFSHOP: Main Orders Table
-- ============================================================

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  total NUMERIC(12,3) NOT NULL DEFAULT 0,
  deposit NUMERIC(12,3) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(12,3) NOT NULL DEFAULT 0,
  delivery_type TEXT NOT NULL DEFAULT 'pickup' CHECK (delivery_type IN ('pickup', 'delivery')),
  courier TEXT,
  gouvernorat TEXT,
  tracking_number TEXT,
  source TEXT NOT NULL DEFAULT 'phone',
  status TEXT NOT NULL DEFAULT 'nouveau' CHECK (status IN ('nouveau', 'en-preparation', 'pret', 'en-livraison', 'livre')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  delivery_date TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_address TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  finished_product_id UUID,
  name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  changed_by_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment_collections table
CREATE TABLE IF NOT EXISTS public.payment_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  amount NUMERIC(12,3) NOT NULL,
  payment_method TEXT NOT NULL,
  collected_by TEXT NOT NULL,
  collector_name TEXT,
  reference TEXT,
  notes TEXT,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_collections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
CREATE POLICY orders_select_tenant ON public.orders FOR SELECT USING (true);
CREATE POLICY orders_insert_tenant ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY orders_update_tenant ON public.orders FOR UPDATE USING (true);
CREATE POLICY orders_delete_tenant ON public.orders FOR DELETE USING (true);

-- Create RLS policies for order_items
CREATE POLICY order_items_select_tenant ON public.order_items FOR SELECT USING (true);
CREATE POLICY order_items_insert_tenant ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY order_items_update_tenant ON public.order_items FOR UPDATE USING (true);
CREATE POLICY order_items_delete_tenant ON public.order_items FOR DELETE USING (true);

-- Create RLS policies for order_status_history
CREATE POLICY order_status_history_select_tenant ON public.order_status_history FOR SELECT USING (true);
CREATE POLICY order_status_history_insert_tenant ON public.order_status_history FOR INSERT WITH CHECK (true);

-- Create RLS policies for payment_collections
CREATE POLICY payment_collections_select_tenant ON public.payment_collections FOR SELECT USING (true);
CREATE POLICY payment_collections_insert_tenant ON public.payment_collections FOR INSERT WITH CHECK (true);
CREATE POLICY payment_collections_delete_tenant ON public.payment_collections FOR DELETE USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON public.orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_collections_order ON public.payment_collections(order_id);
