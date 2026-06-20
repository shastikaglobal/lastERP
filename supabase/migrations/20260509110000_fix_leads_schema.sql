
-- Fix missing company_id column in leads table
-- and ensure RLS is correctly configured

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- If there are existing leads without a company_id, backfill them with the HQ company if possible
DO $$
DECLARE
  hq_id UUID := '00000000-0000-0000-0000-00000000ae01';
BEGIN
  UPDATE public.leads SET company_id = hq_id WHERE company_id IS NULL;
END $$;

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS leads_select_policy ON public.leads;
DROP POLICY IF EXISTS leads_insert_policy ON public.leads;
DROP POLICY IF EXISTS leads_update_policy ON public.leads;
DROP POLICY IF EXISTS leads_delete_policy ON public.leads;

-- Create multi-tenant policies
CREATE POLICY leads_select_policy ON public.leads
  FOR SELECT USING (company_id = public.current_company_id());

CREATE POLICY leads_insert_policy ON public.leads
  FOR INSERT WITH CHECK (company_id = public.current_company_id());

CREATE POLICY leads_update_policy ON public.leads
  FOR UPDATE USING (company_id = public.current_company_id());

CREATE POLICY leads_delete_policy ON public.leads
  FOR DELETE USING (company_id = public.current_company_id());

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
