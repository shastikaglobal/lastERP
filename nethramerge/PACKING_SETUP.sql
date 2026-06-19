-- ============================================================
-- PACKING PROTOCOLS TABLE SETUP
-- ============================================================
-- Run this SQL in Supabase Dashboard: SQL Editor
-- ============================================================

-- Step 1: Create the packing_protocols table
CREATE TABLE IF NOT EXISTS public.packing_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_id TEXT NOT NULL,
  carton_count INTEGER NOT NULL DEFAULT 1,
  net_weight NUMERIC NOT NULL DEFAULT 0,
  gross_weight NUMERIC NOT NULL DEFAULT 0,
  pallet_config TEXT DEFAULT 'EUR',
  export_marks TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
  company_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add indexes
CREATE INDEX IF NOT EXISTS idx_packing_protocols_company_id ON public.packing_protocols(company_id);
CREATE INDEX IF NOT EXISTS idx_packing_protocols_status ON public.packing_protocols(status);
CREATE INDEX IF NOT EXISTS idx_packing_protocols_created_at ON public.packing_protocols(created_at DESC);

-- Step 3: Enable Row Level Security
ALTER TABLE public.packing_protocols ENABLE ROW LEVEL SECURITY;

-- Step 4: Add RLS Policies
DROP POLICY IF EXISTS "Users can view packing protocols" ON public.packing_protocols;
CREATE POLICY "Users can view packing protocols" 
  ON public.packing_protocols 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create packing protocols" ON public.packing_protocols;
CREATE POLICY "Users can create packing protocols" 
  ON public.packing_protocols 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update packing protocols" ON public.packing_protocols;
CREATE POLICY "Users can update packing protocols" 
  ON public.packing_protocols 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete packing protocols" ON public.packing_protocols;
CREATE POLICY "Users can delete packing protocols" 
  ON public.packing_protocols 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Verification: Check if table was created successfully
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'packing_protocols';
