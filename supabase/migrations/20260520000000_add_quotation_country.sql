-- Add country_of_origin to quotations table
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS country_of_origin TEXT DEFAULT 'India';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
