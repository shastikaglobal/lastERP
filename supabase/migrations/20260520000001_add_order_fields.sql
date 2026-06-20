-- Add new fields for invoice/order export details
ALTER TABLE public.export_orders 
ADD COLUMN IF NOT EXISTS country_of_origin TEXT DEFAULT 'India',
ADD COLUMN IF NOT EXISTS port_of_loading TEXT,
ADD COLUMN IF NOT EXISTS port_of_discharge TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
