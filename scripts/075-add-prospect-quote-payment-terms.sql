-- Add quote payment terms for tenant prospect quotes.
-- Supports enforcing acompte or payment-at-order requirements.

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS quote_payment_mode text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS quote_payment_amount numeric(12,3),
  ADD COLUMN IF NOT EXISTS quote_payment_received boolean DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prospects_quote_payment_mode_check'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_quote_payment_mode_check
      CHECK (quote_payment_mode IN ('none', 'acompte', 'paiement_commande'));
  END IF;
END $$;
