-- Create Parties table for Tally module (Masters > Parties)
-- This table stores customers and vendors (parties) for accounting/billing purposes

DO $$ BEGIN
    CREATE TYPE party_type AS ENUM ('Customer', 'Vendor');
    CREATE TYPE party_status AS ENUM ('Active', 'Pending', 'Inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gstin TEXT,
    type party_type NOT NULL DEFAULT 'Customer',
    state TEXT,
    credit_limit NUMERIC DEFAULT 0,
    outstanding NUMERIC DEFAULT 0,
    overdue NUMERIC DEFAULT 0,
    status party_status DEFAULT 'Active',
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_parties_company_id ON public.parties(company_id);
CREATE INDEX IF NOT EXISTS idx_parties_type ON public.parties(type);
CREATE INDEX IF NOT EXISTS idx_parties_status ON public.parties(status);
CREATE INDEX IF NOT EXISTS idx_parties_is_deleted ON public.parties(is_deleted);
CREATE INDEX IF NOT EXISTS idx_parties_name ON public.parties(name);
CREATE INDEX IF NOT EXISTS idx_parties_gstin ON public.parties(gstin);

-- Enable Row Level Security
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view parties in their company" ON public.parties;
DROP POLICY IF EXISTS "Users can insert parties in their company" ON public.parties;
DROP POLICY IF EXISTS "Users can update parties in their company" ON public.parties;
DROP POLICY IF EXISTS "Users can delete parties in their company" ON public.parties;

-- RLS Policies
-- SELECT: Users can view all parties in their company (excluding soft-deleted)
CREATE POLICY "Users can view parties in their company"
ON public.parties FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND is_deleted = false
);

-- INSERT: Users can create parties in their company
CREATE POLICY "Users can insert parties in their company"
ON public.parties FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- UPDATE: Users can update parties in their company
CREATE POLICY "Users can update parties in their company"
ON public.parties FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- DELETE: Users can soft-delete parties (set is_deleted = true) in their company
CREATE POLICY "Users can delete parties in their company"
ON public.parties FOR DELETE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_parties_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_parties_updated_at
        BEFORE UPDATE ON public.parties
        FOR EACH ROW
        EXECUTE FUNCTION update_parties_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Seed sample data (parties for the first company)
DO $$
DECLARE
    first_company_id UUID;
BEGIN
    SELECT id INTO first_company_id FROM companies LIMIT 1;
    
    IF first_company_id IS NOT NULL THEN
        INSERT INTO public.parties (company_id, name, gstin, type, state, credit_limit, outstanding, overdue, status)
        VALUES 
            (first_company_id, 'Sahara Traders', '29AABCS1234F1Z2', 'Customer'::party_type, 'Karnataka', 1200000, 175000, 25000, 'Active'::party_status),
            (first_company_id, 'Metro Suppliers', '27AABCM1234F1Z4', 'Vendor'::party_type, 'Maharashtra', 850000, -95000, 0, 'Active'::party_status),
            (first_company_id, 'Rural Agri', '33AAEER1234F1Z9', 'Customer'::party_type, 'Karnataka', 975000, 62000, 17000, 'Active'::party_status),
            (first_company_id, 'Nexa Industries', '07AABCN1234F1Z6', 'Vendor'::party_type, 'Uttar Pradesh', 1500000, -42000, 0, 'Active'::party_status),
            (first_company_id, 'Greenfield Exports', '29AABCG1234F1Z7', 'Customer'::party_type, 'Karnataka', 650000, 43000, 8800, 'Pending'::party_status),
            (first_company_id, 'Apex Logistics', '33AABCA1234F1Z8', 'Vendor'::party_type, 'Tamil Nadu', 1100000, -20500, 0, 'Active'::party_status)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
