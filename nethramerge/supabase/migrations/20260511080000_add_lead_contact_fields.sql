-- Add email and phone columns to leads table if they don't exist
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
