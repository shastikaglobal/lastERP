-- Add cost and shipment type fields to quotations
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipment_type TEXT; -- e.g. 'FCL', 'LCL', 'Air'

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';


