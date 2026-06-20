-- Expand warehouses table with agri-export relevant fields
ALTER TABLE public.warehouses
  ADD COLUMN IF NOT EXISTS warehouse_type TEXT DEFAULT 'Dry Storage',
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS capacity_kg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manager_name TEXT,
  ADD COLUMN IF NOT EXISTS manager_phone TEXT,
  ADD COLUMN IF NOT EXISTS fssai_license TEXT,
  ADD COLUMN IF NOT EXISTS is_cold_chain BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill city from existing location field (best effort)
UPDATE public.warehouses
SET city = location
WHERE city IS NULL AND location IS NOT NULL;

NOTIFY pgrst, 'reload schema';
