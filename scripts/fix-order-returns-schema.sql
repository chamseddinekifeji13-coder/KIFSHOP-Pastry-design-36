-- ============================================================
-- CREATE ORDER_RETURNS TABLE AND RELATED TABLES
-- Problem: order_returns table doesn't exist in schema
-- ============================================================

-- Create order_returns table
CREATE TABLE IF NOT EXISTS public.order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  return_type text NOT NULL CHECK (return_type IN ('total', 'partial')),
  reason text NOT NULL CHECK (reason IN ('damaged', 'wrong_order', 'client_absent', 'client_refused', 'quality', 'expired', 'other')),
  reason_details text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  refund_method text CHECK (refund_method IN ('cash_refund', 'bank_refund', 'credit_note')),
  refund_amount numeric(12,3) NOT NULL DEFAULT 0,
  credit_note_id uuid,
  processed_by uuid REFERENCES auth.users(id),
  processed_by_name text,
  processed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_returns_tenant_access" ON public.order_returns FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_order_returns_tenant ON public.order_returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_order ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON public.order_returns(tenant_id, status);

-- Create order_return_items table
CREATE TABLE IF NOT EXISTS public.order_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.order_returns(id) ON DELETE CASCADE,
  order_item_id text,
  product_name text NOT NULL,
  quantity_returned numeric(12,3) NOT NULL,
  unit_price numeric(12,3) NOT NULL,
  subtotal numeric(12,3) NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_return_items_return ON public.order_return_items(return_id);

-- Create customer_credits table
CREATE TABLE IF NOT EXISTS public.customer_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text,
  original_order_id uuid REFERENCES public.orders(id),
  return_id uuid REFERENCES public.order_returns(id),
  amount numeric(12,3) NOT NULL,
  used_amount numeric(12,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_used', 'fully_used', 'expired')),
  expires_at timestamptz,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_credits_tenant_access" ON public.customer_credits FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_customer_credits_tenant ON public.customer_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_customer ON public.customer_credits(tenant_id, customer_name);

-- Add columns to orders table if they don't exist (for returns tracking)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS return_status text,
ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS confirmed_by_name text,
ADD COLUMN IF NOT EXISTS truecaller_verified boolean DEFAULT false;

-- Add offer fields to orders table if they don't exist
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'normal' CHECK (order_type IN ('normal', 'offre_client', 'offre_personnel')),
ADD COLUMN IF NOT EXISTS offer_beneficiary text,
ADD COLUMN IF NOT EXISTS offer_reason text,
ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0;

-- Create order_status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_status_history_tenant_access" ON public.order_status_history FOR ALL
  USING (tenant_id IN (SELECT tu.tenant_id FROM public.tenant_users tu WHERE tu.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_tenant ON public.order_status_history(tenant_id);
