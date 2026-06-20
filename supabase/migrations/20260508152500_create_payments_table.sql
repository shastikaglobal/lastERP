-- Payments Module Schema
-- Supports professional tracking of incoming and outgoing payments

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID REFERENCES customers(id),
  payment_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  method TEXT, -- 'Wire Transfer', 'LC', 'Cash', etc.
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
  reference_number TEXT, -- Invoice number or internal reference
  received_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their company payments" ON public.payments FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = payments.company_id)
);

CREATE POLICY "Users can insert their company payments" ON public.payments FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = payments.company_id)
);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
