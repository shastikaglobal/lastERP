-- Force a schema reload for batch_barcodes fields
-- This fixes the "Could not find the 'carton_number_total' column of 'batch_barcodes' in the schema cache" error

DO $$ 
BEGIN
    -- Ensure all professional export tracking fields exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batch_barcodes' AND column_name = 'carton_number_total') THEN
        ALTER TABLE public.batch_barcodes ADD COLUMN carton_number_total INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batch_barcodes' AND column_name = 'net_weight') THEN
        ALTER TABLE public.batch_barcodes ADD COLUMN net_weight DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batch_barcodes' AND column_name = 'packing_date') THEN
        ALTER TABLE public.batch_barcodes ADD COLUMN packing_date DATE DEFAULT CURRENT_DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'batch_barcodes' AND column_name = 'sku_code') THEN
        ALTER TABLE public.batch_barcodes ADD COLUMN sku_code TEXT;
    END IF;
END $$;

-- Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';
