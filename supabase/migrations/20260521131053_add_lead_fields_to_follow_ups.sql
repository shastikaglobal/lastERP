-- Add lead metadata columns to follow_ups table
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS business_category TEXT;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE follow_ups ADD COLUMN IF NOT EXISTS website TEXT;
