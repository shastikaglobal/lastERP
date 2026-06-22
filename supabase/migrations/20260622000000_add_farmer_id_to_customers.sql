-- Add farmer_id to customers table to reliably track farmer-to-customer conversions
-- This replaces the fragile email-matching approach for detecting converted farmers

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_farmer_id ON public.customers (farmer_id);
