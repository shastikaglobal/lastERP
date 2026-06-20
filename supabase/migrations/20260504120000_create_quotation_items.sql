-- 20260504120000_create_quotation_items.sql

-- Create table for line items of a quotation
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security for the new table
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Simple policy for testing – allow any authenticated insert/select
CREATE POLICY "allow_all_insert" ON public.quotation_items FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_select" ON public.quotation_items FOR SELECT USING (true);

-- Ensure quotations table also has permissive policies for testing
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_insert_quotations" ON public.quotations FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_select_quotations" ON public.quotations FOR SELECT USING (true);
