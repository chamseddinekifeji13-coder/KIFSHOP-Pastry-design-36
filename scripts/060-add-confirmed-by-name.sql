-- Add confirmed_by_name column to orders table
-- This column stores the name of the user who created/confirmed the order

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS confirmed_by_name TEXT;

-- Also add other missing columns that might be needed
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id);

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS returned_by UUID REFERENCES auth.users(id);

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS returned_by_name TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS return_status TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS truecaller_verified BOOLEAN DEFAULT false;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'normal';

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS offer_beneficiary TEXT;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_by ON public.orders(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);
