-- Add net_weight to quotations
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS net_weight TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
