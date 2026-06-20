-- Fix missing columns in export_orders table
-- This adds the necessary fields for professional trade documents

ALTER TABLE public.export_orders 
ADD COLUMN IF NOT EXISTS hsn_code TEXT,
ADD COLUMN IF NOT EXISTS packing_details TEXT,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS incoterms TEXT DEFAULT 'CIF',
ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- Update RLS policies to ensure these columns are accessible
-- (They should be covered by existing policies, but this ensures the schema cache refreshes)
NOTIFY pgrst, 'reload schema';
