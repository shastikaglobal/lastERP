-- Add customer phone to quotations
ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
