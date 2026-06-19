-- Fix missing created_by column in export_shipments
-- This fixes the error: record "new" has no field "created_by"

ALTER TABLE public.export_shipments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- Update existing shipments to have a creator (using company_id logic or default)
UPDATE public.export_shipments 
SET created_by = (SELECT id FROM public.profiles WHERE company_id = export_shipments.company_id LIMIT 1)
WHERE created_by IS NULL;

NOTIFY pgrst, 'reload schema';
