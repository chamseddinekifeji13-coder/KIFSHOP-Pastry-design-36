-- Add event + quote tracking fields for tenant prospects
-- (fete/mariage workflow with devis follow-up)

ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS event_date timestamptz,
  ADD COLUMN IF NOT EXISTS quote_status text DEFAULT 'non_demande',
  ADD COLUMN IF NOT EXISTS quote_amount numeric(12,3),
  ADD COLUMN IF NOT EXISTS quote_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prospects_event_type_check'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_event_type_check
      CHECK (event_type IS NULL OR event_type IN ('fete', 'mariage'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prospects_quote_status_check'
  ) THEN
    ALTER TABLE public.prospects
      ADD CONSTRAINT prospects_quote_status_check
      CHECK (quote_status IN ('non_demande', 'a_preparer', 'envoye', 'accepte', 'refuse'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prospects_event_date ON public.prospects(event_date);
CREATE INDEX IF NOT EXISTS idx_prospects_quote_status ON public.prospects(quote_status);
