-- Fix shipment_status enum to include all statuses used in the UI
-- Also add carrier and origin columns for richer display

-- 1. Extend the enum with the missing values
ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'Shipped';
ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'Delayed';
ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'Customs Hold';

-- 2. Add carrier and origin columns to shipments table
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS origin TEXT;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS eta_date DATE;

-- 3. Backfill some realistic data for existing shipments
UPDATE shipments SET
  carrier = CASE (RANDOM() * 3)::INT
    WHEN 0 THEN 'Maersk'
    WHEN 1 THEN 'MSC'
    WHEN 2 THEN 'CMA CGM'
    ELSE 'Hapag-Lloyd'
  END,
  origin = CASE (RANDOM() * 2)::INT
    WHEN 0 THEN 'Mumbai, IN'
    WHEN 1 THEN 'Chennai, IN'
    ELSE 'Kolkata, IN'
  END,
  eta_date = CURRENT_DATE + (RANDOM() * 30)::INT
WHERE carrier IS NULL;
