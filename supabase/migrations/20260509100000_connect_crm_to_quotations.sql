
-- Add lead_id to quotations to connect CRM leads with Quotations
ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS lead_id UUID;

-- Optional: Add a foreign key if you want to enforce integrity
-- ALTER TABLE public.quotations ADD CONSTRAINT quotations_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

-- Ensure RLS allows selecting quotations with lead_id
-- (Existing policies should already cover this since they use company_id)

-- Add company_id to leads if it's missing (it was missing in some insert logic)
-- ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
