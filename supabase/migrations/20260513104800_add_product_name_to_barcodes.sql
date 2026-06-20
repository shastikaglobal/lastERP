-- Add product_name field to batch_barcodes to support standalone printing
ALTER TABLE batch_barcodes ADD COLUMN IF NOT EXISTS product_name TEXT;
