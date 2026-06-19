-- 1. Ensure Customer Emails are unique per company to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_customer_email_per_company 
ON customers (email, company_id) 
WHERE email IS NOT NULL AND email != '';

-- 2. Add high-performance indexes for fast searching/filtering
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers (company_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers (created_at DESC);

-- 3. Ensure every customer record has auditing fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Set default values to prevent null crashes
ALTER TABLE customers ALTER COLUMN name SET NOT NULL;
ALTER TABLE customers ALTER COLUMN company_id SET NOT NULL;
