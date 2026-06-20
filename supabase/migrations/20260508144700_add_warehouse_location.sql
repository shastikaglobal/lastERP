-- Add location column to warehouses table to support professional location tracking
-- and reload schema cache for PostgREST

ALTER TABLE public.warehouses 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
