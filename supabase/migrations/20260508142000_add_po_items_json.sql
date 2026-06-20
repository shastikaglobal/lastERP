-- Add items JSONB column to purchase_orders to support direct item storage
-- and reload schema cache for PostgREST

ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
