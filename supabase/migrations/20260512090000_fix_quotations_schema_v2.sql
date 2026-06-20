-- Fix missing columns in quotations and quotation_items
-- This migration ensures the database schema matches the frontend implementation

ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS container_type TEXT,
ADD COLUMN IF NOT EXISTS packaging_type TEXT,
ADD COLUMN IF NOT EXISTS packaging_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipment_type TEXT,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS incoterm TEXT DEFAULT 'CIF',
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id);

ALTER TABLE public.quotation_items
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS hsn_code TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
