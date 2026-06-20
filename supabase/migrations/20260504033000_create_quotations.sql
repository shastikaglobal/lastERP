-- Quotations Module Migration

DO $$ BEGIN
    CREATE TYPE quotation_status AS ENUM ('Draft', 'Pending', 'In Review', 'Approved', 'Rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID REFERENCES customers(id),
  quotation_number TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  status quotation_status DEFAULT 'Draft',
  items_count INTEGER DEFAULT 0,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

-- Policies for quotations
CREATE POLICY "Users can view their company quotations" ON public.quotations FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = quotations.company_id)
);

CREATE POLICY "Users can insert their company quotations" ON public.quotations FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = quotations.company_id)
);

CREATE POLICY "Users can update their company quotations" ON public.quotations FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = quotations.company_id)
);

CREATE POLICY "Users can delete their company quotations" ON public.quotations FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = quotations.company_id)
);

-- Policies for quotation_items
CREATE POLICY "Users can view their quotation items" ON public.quotation_items FOR SELECT USING (
  quotation_id IN (
    SELECT id FROM quotations WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can insert their quotation items" ON public.quotation_items FOR INSERT WITH CHECK (
  quotation_id IN (
    SELECT id FROM quotations WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their quotation items" ON public.quotation_items FOR UPDATE USING (
  quotation_id IN (
    SELECT id FROM quotations WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "Users can delete their quotation items" ON public.quotation_items FOR DELETE USING (
  quotation_id IN (
    SELECT id FROM quotations WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  )
);
