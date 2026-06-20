-- Create Chart of Accounts table for Tally module (Masters > Chart of Accounts)
-- This table stores all accounting accounts (assets, liabilities, income, expenses, equity)

DO $$ BEGIN
    CREATE TYPE account_type AS ENUM ('Asset', 'Liability', 'Income', 'Expense', 'Equity');
    CREATE TYPE account_status AS ENUM ('Active', 'Inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    "group" TEXT NOT NULL,
    type account_type NOT NULL,
    balance NUMERIC DEFAULT 0,
    gst BOOLEAN DEFAULT false,
    status account_status DEFAULT 'Active',
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_coa_company_id ON public.chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_coa_code ON public.chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_coa_type ON public.chart_of_accounts(type);
CREATE INDEX IF NOT EXISTS idx_coa_group ON public.chart_of_accounts("group");
CREATE INDEX IF NOT EXISTS idx_coa_status ON public.chart_of_accounts(status);
CREATE INDEX IF NOT EXISTS idx_coa_is_deleted ON public.chart_of_accounts(is_deleted);

-- Enable Row Level Security
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view chart of accounts in their company" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Users can insert chart of accounts in their company" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Users can update chart of accounts in their company" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Users can delete chart of accounts in their company" ON public.chart_of_accounts;

-- RLS Policies
-- SELECT: Users can view all accounts in their company (excluding soft-deleted)
CREATE POLICY "Users can view chart of accounts in their company"
ON public.chart_of_accounts FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND is_deleted = false
);

-- INSERT: Users can create accounts in their company
CREATE POLICY "Users can insert chart of accounts in their company"
ON public.chart_of_accounts FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- UPDATE: Users can update accounts in their company
CREATE POLICY "Users can update chart of accounts in their company"
ON public.chart_of_accounts FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- DELETE: Users can soft-delete accounts in their company
CREATE POLICY "Users can delete chart of accounts in their company"
ON public.chart_of_accounts FOR DELETE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chart_of_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_chart_of_accounts_updated_at
        BEFORE UPDATE ON public.chart_of_accounts
        FOR EACH ROW
        EXECUTE FUNCTION update_chart_of_accounts_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Seed sample data (chart of accounts for the first company)
DO $$
DECLARE
    first_company_id UUID;
BEGIN
    SELECT id INTO first_company_id FROM companies LIMIT 1;
    
    IF first_company_id IS NOT NULL THEN
        INSERT INTO public.chart_of_accounts (company_id, code, name, "group", type, balance, gst, status)
        VALUES 
            -- Current Assets
            (first_company_id, '1001', 'Cash', 'Current Assets', 'Asset'::account_type, 420000, false, 'Active'::account_status),
            (first_company_id, '1002', 'Bank Account', 'Current Assets', 'Asset'::account_type, 850000, false, 'Active'::account_status),
            (first_company_id, '1003', 'Accounts Receivable', 'Current Assets', 'Asset'::account_type, 325000, false, 'Active'::account_status),
            (first_company_id, '1004', 'Short-term Investments', 'Current Assets', 'Asset'::account_type, 200000, false, 'Active'::account_status),
            
            -- Fixed Assets
            (first_company_id, '1100', 'Land & Building', 'Fixed Assets', 'Asset'::account_type, 2500000, false, 'Active'::account_status),
            (first_company_id, '1101', 'Plant & Equipment', 'Fixed Assets', 'Asset'::account_type, 1200000, false, 'Active'::account_status),
            (first_company_id, '1102', 'Furniture & Fixtures', 'Fixed Assets', 'Asset'::account_type, 150000, false, 'Active'::account_status),
            
            -- Current Liabilities
            (first_company_id, '2001', 'Accounts Payable', 'Current Liabilities', 'Liability'::account_type, -312000, true, 'Active'::account_status),
            (first_company_id, '2002', 'Short-term Loan', 'Current Liabilities', 'Liability'::account_type, -500000, false, 'Active'::account_status),
            (first_company_id, '2003', 'Salary Payable', 'Current Liabilities', 'Liability'::account_type, -85000, false, 'Active'::account_status),
            
            -- Long-term Liabilities
            (first_company_id, '2100', 'Long-term Loan', 'Long-term Liabilities', 'Liability'::account_type, -1000000, false, 'Active'::account_status),
            
            -- Equity
            (first_company_id, '3001', 'Owner Capital', 'Equity', 'Equity'::account_type, 1500000, false, 'Active'::account_status),
            (first_company_id, '3002', 'Retained Earnings', 'Equity', 'Equity'::account_type, 850000, false, 'Active'::account_status),
            
            -- Revenue
            (first_company_id, '4001', 'Sales Revenue', 'Revenue', 'Income'::account_type, 1500000, true, 'Active'::account_status),
            (first_company_id, '4002', 'Service Revenue', 'Revenue', 'Income'::account_type, 750000, true, 'Active'::account_status),
            (first_company_id, '4003', 'Other Income', 'Revenue', 'Income'::account_type, 50000, false, 'Active'::account_status),
            
            -- Direct Expenses
            (first_company_id, '5001', 'Cost of Goods Sold', 'Direct Expenses', 'Expense'::account_type, -600000, true, 'Active'::account_status),
            (first_company_id, '5002', 'Raw Materials', 'Direct Expenses', 'Expense'::account_type, -300000, true, 'Active'::account_status),
            
            -- Indirect Expenses
            (first_company_id, '6001', 'Salary & Wages', 'Indirect Expenses', 'Expense'::account_type, -450000, false, 'Active'::account_status),
            (first_company_id, '6002', 'Rent Expense', 'Indirect Expenses', 'Expense'::account_type, -120000, true, 'Active'::account_status),
            (first_company_id, '6003', 'Utilities', 'Indirect Expenses', 'Expense'::account_type, -45000, true, 'Active'::account_status),
            (first_company_id, '6004', 'Office Supplies', 'Indirect Expenses', 'Expense'::account_type, -35000, true, 'Active'::account_status),
            (first_company_id, '6005', 'Marketing & Advertising', 'Indirect Expenses', 'Expense'::account_type, -80000, true, 'Active'::account_status),
            (first_company_id, '6006', 'Depreciation', 'Indirect Expenses', 'Expense'::account_type, -50000, false, 'Active'::account_status),
            (first_company_id, '6007', 'Interest Expense', 'Indirect Expenses', 'Expense'::account_type, -25000, false, 'Active'::account_status)
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;
