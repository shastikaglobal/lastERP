
-- Add relationship management fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS relationship_status TEXT DEFAULT 'Active Client';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS satisfaction_notes TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_date TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS repeat_order_count INTEGER DEFAULT 0;

-- Update existing records with default status if null
UPDATE customers SET relationship_status = 'Active Client' WHERE relationship_status IS NULL;
