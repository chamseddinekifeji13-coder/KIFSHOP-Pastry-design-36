-- Fix packaging table schema - add missing columns
ALTER TABLE public.packaging ADD COLUMN IF NOT EXISTS type text DEFAULT 'autre';
ALTER TABLE public.packaging ADD COLUMN IF NOT EXISTS price numeric(12,3) NOT NULL DEFAULT 0;
UPDATE public.packaging SET price = COALESCE(price_per_unit, 0) WHERE price = 0;
CREATE INDEX IF NOT EXISTS idx_packaging_type ON public.packaging(type);
