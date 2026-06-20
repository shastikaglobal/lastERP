-- Seed sample Chart of Accounts for demonstration
-- This adds common accounting accounts to the first company

DO $$
DECLARE
    company_id UUID;
BEGIN
    -- Get the first company ID
    SELECT id INTO company_id FROM public.companies LIMIT 1;
    
    IF company_id IS NOT NULL THEN
        -- Clear existing sample data to avoid duplicates
        DELETE FROM public.chart_of_accounts 
        WHERE company_id = company_id 
        AND name IN ('Cash Account', 'Bank Account', 'Sales Account', 'Purchase Account', 
                     'Expense Account', 'Tax Account (GST)', 'Sundry Debtors', 'Sundry Creditors');

        -- Insert sample accounts
        INSERT INTO public.chart_of_accounts 
        (company_id, code, name, "group", type, status, gst, created_by) 
        VALUES
        (company_id, '1010', 'Cash Account', 'Cash', 'Asset', 'Active', false, NULL),
        (company_id, '1020', 'Bank Account', 'Bank', 'Asset', 'Active', false, NULL),
        (company_id, '2010', 'Sales Account', 'Sales', 'Income', 'Active', true, NULL),
        (company_id, '3010', 'Purchase Account', 'Purchases', 'Expense', 'Active', true, NULL),
        (company_id, '4010', 'Expense Account', 'Operating Expenses', 'Expense', 'Active', false, NULL),
        (company_id, '5010', 'Tax Account (GST)', 'Tax', 'Liability', 'Active', true, NULL),
        (company_id, '1030', 'Sundry Debtors', 'Receivables', 'Asset', 'Active', false, NULL),
        (company_id, '2020', 'Sundry Creditors', 'Payables', 'Liability', 'Active', false, NULL)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;
