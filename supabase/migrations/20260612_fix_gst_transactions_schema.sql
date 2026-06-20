-- Fix GST Transactions Schema Cache and Add Missing Columns
-- This migration ensures all required GST transaction columns exist

DO $$ BEGIN
    -- Create the table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.gst_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id),
        date DATE NOT NULL,
        party TEXT,
        gstin TEXT,
        invoice_no TEXT,
        taxable_amt NUMERIC DEFAULT 0,
        cgst NUMERIC DEFAULT 0,
        sgst NUMERIC DEFAULT 0,
        igst NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        type TEXT DEFAULT 'Sales', -- Sales or Purchase
        is_deleted BOOLEAN DEFAULT false,
        deleted_at TIMESTAMPTZ DEFAULT NULL,
        deleted_by UUID DEFAULT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID DEFAULT NULL
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns if they don't exist
ALTER TABLE public.gst_transactions
  ADD COLUMN IF NOT EXISTS date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS party TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS invoice_no TEXT,
  ADD COLUMN IF NOT EXISTS taxable_amt NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Sales',
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- Enable RLS
ALTER TABLE public.gst_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their company GST transactions" ON public.gst_transactions;
DROP POLICY IF EXISTS "Users can insert GST transactions for their company" ON public.gst_transactions;
DROP POLICY IF EXISTS "Users can update GST transactions for their company" ON public.gst_transactions;
DROP POLICY IF EXISTS "Users can delete GST transactions for their company" ON public.gst_transactions;

-- Create RLS Policies
CREATE POLICY "Users can view their company GST transactions" 
ON public.gst_transactions 
FOR SELECT USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = gst_transactions.company_id)
);

CREATE POLICY "Users can insert GST transactions for their company" 
ON public.gst_transactions 
FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = gst_transactions.company_id)
);

CREATE POLICY "Users can update GST transactions for their company" 
ON public.gst_transactions 
FOR UPDATE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = gst_transactions.company_id)
);

CREATE POLICY "Users can delete GST transactions for their company" 
ON public.gst_transactions 
FOR DELETE USING (
  auth.uid() IN (SELECT id FROM profiles WHERE company_id = gst_transactions.company_id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_gst_transactions_company_id ON public.gst_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_gst_transactions_date ON public.gst_transactions(date);
CREATE INDEX IF NOT EXISTS idx_gst_transactions_type ON public.gst_transactions(type);
CREATE INDEX IF NOT EXISTS idx_gst_transactions_is_deleted ON public.gst_transactions(is_deleted);

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_gst_transactions_updated_at ON public.gst_transactions;

CREATE OR REPLACE FUNCTION update_gst_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_gst_transactions_updated_at
    BEFORE UPDATE ON public.gst_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_gst_transactions_updated_at();

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
