
-- 1. Create Email Templates table for production management
CREATE TABLE IF NOT EXISTS public.email_templates
 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for templates
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY templates_select ON public.email_templates
  FOR SELECT USING (company_id = public.current_company_id());

CREATE POLICY templates_modify ON public.email_templates
  FOR ALL USING (company_id = public.current_company_id());

-- 2. Fix Lead Stage Check Constraint
-- First, find out what the current allowed stages are (often set in a migration)
-- Then, expand them to include common production stages.
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_stage_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_stage_check CHECK (
  stage IN ('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost', 'Nurturing')
);

-- 3. Seed some initial templates into the database so it's not empty
-- (Using the HQ company ID as a fallback if needed)
DO $$
DECLARE
  hq_id UUID := '00000000-0000-0000-0000-00000000ae01';
BEGIN
  INSERT INTO public.email_templates (company_id, name, subject, body)
  VALUES 
    (hq_id, 'Welcome Message', 'Welcome to Shastika Global Impex', '<p>Dear Customer,</p><p>Thank you for reaching out to us. We have received your inquiry.</p>'),
    (hq_id, 'etails', 'Quotation for Products', '<p>Please find the requested quotation attached to this email.</p>'),
    (hq_id, 'Follow Up', 'Following up on your inquiry', '<p>I am following up to see if you have any questions about our previous message.</p>')
  ON CONFLICT DO NOTHING;
END $$;
