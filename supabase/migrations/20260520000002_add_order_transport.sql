-- Add more fields for invoice/order export details
ALTER TABLE public.export_orders 
ADD COLUMN IF NOT EXISTS mode_of_transport TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
