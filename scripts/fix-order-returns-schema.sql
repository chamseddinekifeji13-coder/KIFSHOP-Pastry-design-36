-- ============================================================
-- FIX ORDERS TABLE AND CREATE ORDER_RETURNS TABLE
-- Problem: orders table missing client_id, order_returns table doesn't exist
-- ============================================================

-- Add columns to orders table if they don't exist (for returns tracking and offers)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS return_status text,
ADD COLUMN IF NOT EXISTS confirmed_by_name text,
ADD COLUMN IF NOT EXISTS truecaller_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS offer_beneficiary text,
ADD COLUMN IF NOT EXISTS offer_reason text,
ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0;

-- Create order_returns table
CREATE TABLE IF NOT EXISTS public.order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  order_id uuid NOT NULL,
  return_type text NOT NULL,
  reason text NOT NULL,
  reason_details text,
  status text NOT NULL DEFAULT 'pending',
  refund_method text,
  refund_amount numeric(12,3) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_returns_tenant ON public.order_returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_order ON public.order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON public.order_returns(status);

-- Create order_return_items table
CREATE TABLE IF NOT EXISTS public.order_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL,
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
  tenant_id text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  original_order_id uuid,
  return_id uuid,
  amount numeric(12,3) NOT NULL,
  used_amount numeric(12,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_credits_tenant ON public.customer_credits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_customer ON public.customer_credits(customer_name);
