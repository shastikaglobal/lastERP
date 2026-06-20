-- Force a schema reload for PostgREST
-- This fixes the "Could not find the 'items_count' column of 'quotations' in the schema cache" error

-- Ensure items_count exists (just in case)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotations' AND column_name = 'items_count') THEN
        ALTER TABLE public.quotations ADD COLUMN items_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Reload schema
NOTIFY pgrst, 'reload schema';
