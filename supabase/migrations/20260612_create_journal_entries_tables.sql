-- Create journal_entries table
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    voucher_no TEXT NOT NULL,
    voucher_type TEXT NOT NULL DEFAULT 'Journal Voucher',
    date DATE NOT NULL,
    reference_no TEXT,
    narration TEXT,
    status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Posted')),
    total_debit NUMERIC NOT NULL DEFAULT 0,
    total_credit NUMERIC NOT NULL DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT NULL,
    updated_by UUID DEFAULT NULL
);

-- Create journal_entry_rows table
CREATE TABLE IF NOT EXISTS public.journal_entry_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.chart_of_accounts(id),
    account TEXT NOT NULL,
    drcr TEXT NOT NULL CHECK (drcr IN ('Dr', 'Cr')),
    debit NUMERIC NOT NULL DEFAULT 0,
    credit NUMERIC NOT NULL DEFAULT 0,
    gst_percent TEXT DEFAULT 'None',
    gst_amount NUMERIC NOT NULL DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by UUID DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id ON public.journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON public.journal_entries(date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_voucher_no ON public.journal_entries(voucher_no);
CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_journal_entry_rows_journal_entry_id ON public.journal_entry_rows(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_rows_account_id ON public.journal_entry_rows(account_id);

-- Enable Row Level Security
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_rows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view journal entries in their company" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert journal entries in their company" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update journal entries in their company" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can view journal entry rows" ON public.journal_entry_rows;
DROP POLICY IF EXISTS "Users can insert journal entry rows" ON public.journal_entry_rows;

-- RLS Policies for journal_entries
CREATE POLICY "Users can view journal entries in their company"
ON public.journal_entries FOR SELECT
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND is_deleted = false
);

CREATE POLICY "Users can insert journal entries in their company"
ON public.journal_entries FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update journal entries in their company"
ON public.journal_entries FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- RLS Policies for journal_entry_rows
CREATE POLICY "Users can view journal entry rows"
ON public.journal_entry_rows FOR SELECT
USING (
  journal_entry_id IN (
    SELECT id FROM public.journal_entries WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  AND is_deleted = false
);

CREATE POLICY "Users can insert journal entry rows"
ON public.journal_entry_rows FOR INSERT
WITH CHECK (
  journal_entry_id IN (
    SELECT id FROM public.journal_entries WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
);

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_journal_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION update_journal_entry_rows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER update_journal_entries_updated_at
        BEFORE UPDATE ON public.journal_entries
        FOR EACH ROW
        EXECUTE FUNCTION update_journal_entries_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_journal_entry_rows_updated_at
        BEFORE UPDATE ON public.journal_entry_rows
        FOR EACH ROW
        EXECUTE FUNCTION update_journal_entry_rows_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
