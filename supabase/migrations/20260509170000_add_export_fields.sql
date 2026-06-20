-- Add professional export fields to export_orders and quotations
-- These fields are required for the proforma invoice and official quotations

-- 1. Update export_orders
ALTER TABLE public.export_orders 
  ADD COLUMN IF NOT EXISTS customer_gst TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS net_weight TEXT,
  ADD COLUMN IF NOT EXISTS gross_weight TEXT,
  ADD COLUMN IF NOT EXISTS mode_of_transport TEXT DEFAULT 'Sea';

-- 2. Update quotations
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS customer_gst TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS net_weight TEXT,
  ADD COLUMN IF NOT EXISTS gross_weight TEXT,
  ADD COLUMN IF NOT EXISTS port_of_loading TEXT DEFAULT 'CHENNAI PORT',
  ADD COLUMN IF NOT EXISTS port_of_discharge TEXT,
  ADD COLUMN IF NOT EXISTS mode_of_transport TEXT DEFAULT 'Sea';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

