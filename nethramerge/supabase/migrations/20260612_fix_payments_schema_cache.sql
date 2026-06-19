-- Fix payments schema cache issue for created_by column
-- This ensures the created_by column is properly recognized in PostgREST

-- Add created_by column if it doesn't exist
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Ensure the column has proper constraints and indexing
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments(created_by);

-- Also add payer_name column that the code references
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payer_name TEXT;

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- Refresh all affected tables
SELECT pg_catalog.pg_notify('pgrst', 'reload schema');
