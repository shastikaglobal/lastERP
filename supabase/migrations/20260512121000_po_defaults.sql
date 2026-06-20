-- Ensure order_date has a default value
ALTER TABLE purchase_orders ALTER COLUMN order_date SET DEFAULT now();

-- Ensure total and subtotal have default 0 to prevent null errors
ALTER TABLE purchase_orders ALTER COLUMN total SET DEFAULT 0;
ALTER TABLE purchase_orders ALTER COLUMN subtotal SET DEFAULT 0;

-- Ensure currency has a default 'INR'
ALTER TABLE purchase_orders ALTER COLUMN currency SET DEFAULT 'INR';
