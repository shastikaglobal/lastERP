-- Add professional export tracking fields to barcodes
ALTER TABLE batch_barcodes 
ADD COLUMN IF NOT EXISTS net_weight DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS packing_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS sku_code TEXT,
ADD COLUMN IF NOT EXISTS carton_number_total INTEGER;

-- Create an index for faster scanning by code
CREATE INDEX IF NOT EXISTS idx_batch_barcodes_code ON batch_barcodes(code);
