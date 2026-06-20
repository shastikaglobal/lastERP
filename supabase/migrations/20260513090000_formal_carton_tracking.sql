-- Add formal carton tracking to export orders and shipments
-- This removes the need for "hardcoded" or "parsed" values

ALTER TABLE public.export_orders 
ADD COLUMN IF NOT EXISTS total_cartons INTEGER,
ADD COLUMN IF NOT EXISTS unit_net_weight NUMERIC(14,3);

ALTER TABLE public.export_shipments 
ADD COLUMN IF NOT EXISTS total_cartons INTEGER,
ADD COLUMN IF NOT EXISTS unit_net_weight NUMERIC(14,3);

-- Refresh the PostgREST cache
NOTIFY pgrst, 'reload schema';



