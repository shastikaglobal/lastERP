-- Add soft-delete columns to packing_protocols
ALTER TABLE public.packing_protocols
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS deleted_by UUID NULL;

-- Create index on is_deleted for better query performance
CREATE INDEX IF NOT EXISTS idx_packing_protocols_is_deleted ON public.packing_protocols(is_deleted);
CREATE INDEX IF NOT EXISTS idx_packing_protocols_deleted_at ON public.packing_protocols(deleted_at DESC);

-- Update RLS policies to respect soft-delete
DROP POLICY IF EXISTS "Users can view packing protocols" ON public.packing_protocols;
CREATE POLICY "Users can view packing protocols" 
  ON public.packing_protocols 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL AND (is_deleted = false OR is_deleted IS NULL));

-- Log the migration
DO $$ BEGIN
  RAISE NOTICE 'Added soft-delete support to packing_protocols table';
END $$;
