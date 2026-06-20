-- Ensure export_orders payment_status defaults to 'unpaid'
-- This fixes the issue where new orders might show an incorrect or empty payment status

ALTER TABLE public.export_orders 
ALTER COLUMN payment_status SET DEFAULT 'unpaid';

-- Update any existing NULLs to 'unpaid' for consistency
UPDATE public.export_orders 
SET payment_status = 'unpaid' 
WHERE payment_status IS NULL;

-- Ensure the column exists if it was somehow missing from migrations but present in UI
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'export_orders' AND column_name = 'payment_status') THEN
        ALTER TABLE public.export_orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
