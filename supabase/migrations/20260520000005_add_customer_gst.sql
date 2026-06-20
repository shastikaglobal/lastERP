ALTER TABLE public.export_orders ADD COLUMN IF NOT EXISTS customer_gst TEXT;
NOTIFY pgrst, 'reload schema';
