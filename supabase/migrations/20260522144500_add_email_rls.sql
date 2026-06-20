-- Migration to add robust RLS policies for emails and zoho_accounts tables

-- 1. Enable RLS on emails
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- SELECT policy: allow authenticated users to view emails within their company
DROP POLICY IF EXISTS "company_access_emails_select" ON public.emails;
CREATE POLICY "company_access_emails_select" ON public.emails
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- UPDATE policy: allow authenticated users to update emails (e.g. is_read, is_starred)
DROP POLICY IF EXISTS "company_access_emails_update" ON public.emails;
CREATE POLICY "company_access_emails_update" ON public.emails
  FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- INSERT policy: allow authenticated users to insert emails (e.g. draft, sent)
DROP POLICY IF EXISTS "company_access_emails_insert" ON public.emails;
CREATE POLICY "company_access_emails_insert" ON public.emails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- DELETE policy: allow authenticated users to delete emails
DROP POLICY IF EXISTS "company_access_emails_delete" ON public.emails;
CREATE POLICY "company_access_emails_delete" ON public.emails
  FOR DELETE
  TO authenticated
  USING (false);


-- 2. Enable RLS on zoho_accounts
ALTER TABLE public.zoho_accounts ENABLE ROW LEVEL SECURITY;

-- SELECT policy: allow authenticated users to view connected zoho accounts within their company
DROP POLICY IF EXISTS "company_access_zoho_accounts_select" ON public.zoho_accounts;
CREATE POLICY "company_access_zoho_accounts_select" ON public.zoho_accounts
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ALL policy: allow authenticated users to insert/update/delete zoho accounts within their company
DROP POLICY IF EXISTS "company_access_zoho_accounts_all" ON public.zoho_accounts;
CREATE POLICY "company_access_zoho_accounts_all" ON public.zoho_accounts
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );
