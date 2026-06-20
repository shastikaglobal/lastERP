ALTER TABLE public.export_orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
NOTIFY pgrst, 'reload schema';
