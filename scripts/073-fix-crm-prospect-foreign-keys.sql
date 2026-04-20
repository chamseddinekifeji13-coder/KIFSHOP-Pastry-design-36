-- Fix CRM foreign keys to target platform_prospects instead of prospects.
-- This prevents save failures in super-admin CRM when using platform prospect IDs.

ALTER TABLE public.crm_interactions
  DROP CONSTRAINT IF EXISTS crm_interactions_prospect_id_fkey,
  ADD CONSTRAINT crm_interactions_prospect_id_fkey
    FOREIGN KEY (prospect_id) REFERENCES public.platform_prospects(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.crm_reminders
  DROP CONSTRAINT IF EXISTS crm_reminders_prospect_id_fkey,
  ADD CONSTRAINT crm_reminders_prospect_id_fkey
    FOREIGN KEY (prospect_id) REFERENCES public.platform_prospects(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.crm_quotes
  DROP CONSTRAINT IF EXISTS crm_quotes_prospect_id_fkey,
  ADD CONSTRAINT crm_quotes_prospect_id_fkey
    FOREIGN KEY (prospect_id) REFERENCES public.platform_prospects(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.crm_documents
  DROP CONSTRAINT IF EXISTS crm_documents_prospect_id_fkey,
  ADD CONSTRAINT crm_documents_prospect_id_fkey
    FOREIGN KEY (prospect_id) REFERENCES public.platform_prospects(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.crm_activity_log
  DROP CONSTRAINT IF EXISTS crm_activity_log_prospect_id_fkey,
  ADD CONSTRAINT crm_activity_log_prospect_id_fkey
    FOREIGN KEY (prospect_id) REFERENCES public.platform_prospects(id) ON DELETE CASCADE NOT VALID;
