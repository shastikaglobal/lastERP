-- Finance Module: Invoices and Payments Migration

DO $$ BEGIN
    CREATE TYPE invoice_status AS ENUM ('Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled');
    CREATE TYPE payment_status AS ENUM ('Pending', 'Completed', 'Failed', 'Refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    customer_id UUID REFERENCES customers(id),
    order_id UUID REFERENCES sales_orders(id),
    invoice_number TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    status invoice_status DEFAULT 'Pending',
    issued_at TIMESTAMPTZ DEFAULT NOW(),
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    customer_id UUID REFERENCES customers(id),
    party_name TEXT,
    invoice_id UUID REFERENCES invoices(id),
    reference_no TEXT,
    payment_number TEXT NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    method TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    remarks TEXT,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies for invoices
CREATE POLICY "Users can view their company invoices" ON public.invoices FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = invoices.company_id)
);

CREATE POLICY "Users can insert their company invoices" ON public.invoices FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = invoices.company_id)
);

CREATE POLICY "Users can update their company invoices" ON public.invoices FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = invoices.company_id)
);

CREATE POLICY "Users can delete their company invoices" ON public.invoices FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = invoices.company_id)
);

-- Policies for payments
CREATE POLICY "Users can view their company payments" ON public.payments FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = payments.company_id)
);

CREATE POLICY "Users can insert their company payments" ON public.payments FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = payments.company_id)
);

CREATE POLICY "Users can update their company payments" ON public.payments FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = payments.company_id)
);

CREATE POLICY "Users can delete their company payments" ON public.payments FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = payments.company_id)
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_finance_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_invoices_updated_at
        BEFORE UPDATE ON public.invoices
        FOR EACH ROW
        EXECUTE FUNCTION update_finance_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_payments_updated_at
        BEFORE UPDATE ON public.payments
        FOR EACH ROW
        EXECUTE FUNCTION update_finance_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Seed some initial data
DO $$
DECLARE
    first_company_id UUID;
    cust1_id UUID;
    cust2_id UUID;
    order1_id UUID;
    order2_id UUID;
    inv1_id UUID;
    inv2_id UUID;
BEGIN
    SELECT id INTO first_company_id FROM companies LIMIT 1;
    IF first_company_id IS NULL THEN RETURN; END IF;

    -- Get some existing customers and orders
    SELECT id INTO cust1_id FROM customers WHERE company_id = first_company_id LIMIT 1;
    SELECT id INTO cust2_id FROM customers WHERE company_id = first_company_id OFFSET 1 LIMIT 1;

    SELECT id INTO order1_id FROM sales_orders WHERE customer_id = cust1_id LIMIT 1;
    SELECT id INTO order2_id FROM sales_orders WHERE customer_id = cust2_id LIMIT 1;

    -- If we don't have enough data to seed nicely, skip
    IF cust1_id IS NULL THEN RETURN; END IF;

    -- Insert Invoices
    INSERT INTO invoices (company_id, customer_id, order_id, invoice_number, amount, currency, status, issued_at, due_at)
    VALUES 
        (first_company_id, cust1_id, order1_id, 'INV-2025-0156', 48500, 'USD', 'Pending', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days')
    RETURNING id INTO inv1_id;

    IF cust2_id IS NOT NULL THEN
        INSERT INTO invoices (company_id, customer_id, order_id, invoice_number, amount, currency, status, issued_at, due_at)
        VALUES 
            (first_company_id, cust2_id, order2_id, 'INV-2025-0155', 215000, 'USD', 'Paid', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days')
        RETURNING id INTO inv2_id;
        
        -- Insert Payments for the Paid invoice
        INSERT INTO payments (company_id, customer_id, invoice_id, payment_number, amount, currency, method, status, received_at)
        VALUES 
            (first_company_id, cust2_id, inv2_id, 'PAY-2025-0093', 215000, 'USD', 'Wire Transfer', 'Completed', NOW() - INTERVAL '2 days');
    END IF;

    -- Insert another pending payment just for demo
    INSERT INTO payments (company_id, customer_id, invoice_id, payment_number, amount, currency, method, status, received_at)
    VALUES 
        (first_company_id, cust1_id, inv1_id, 'PAY-2025-0094', 48500, 'USD', 'Credit Card', 'Pending', NULL);

END $$;
