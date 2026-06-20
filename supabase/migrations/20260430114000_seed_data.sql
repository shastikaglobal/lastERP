-- ExportOS Phase 2: Insert Initial Seed Data
-- Run this in your Supabase SQL Editor to populate the dashboard!

DO $$
DECLARE
    first_company_id UUID;
    cust1_id UUID;
    cust2_id UUID;
    cust3_id UUID;
    order1_id UUID;
    order2_id UUID;
    order3_id UUID;
BEGIN
    -- Get the first company ID to associate data with
    SELECT id INTO first_company_id FROM companies LIMIT 1;

    -- If no company exists, do nothing
    IF first_company_id IS NULL THEN
        RAISE NOTICE 'No company found. Please create a company first.';
        RETURN;
    END IF;

    -- Insert Customers
    INSERT INTO customers (company_id, name, country) VALUES 
        (first_company_id, 'Mumbai Textiles Ltd', 'India') RETURNING id INTO cust1_id;
    INSERT INTO customers (company_id, name, country) VALUES 
        (first_company_id, 'Berlin Auto GmbH', 'Germany') RETURNING id INTO cust2_id;
    INSERT INTO customers (company_id, name, country) VALUES 
        (first_company_id, 'Osaka Electronics', 'Japan') RETURNING id INTO cust3_id;

    -- Insert Sales Orders (across different months to show the chart trend)
    INSERT INTO sales_orders (company_id, customer_id, order_number, amount, status, created_at) VALUES 
        (first_company_id, cust1_id, 'SO-1001', 412000, 'Delivered', NOW() - INTERVAL '5 months') RETURNING id INTO order1_id;
    
    INSERT INTO sales_orders (company_id, customer_id, order_number, amount, status, created_at) VALUES 
        (first_company_id, cust2_id, 'SO-1002', 892000, 'Shipped', NOW() - INTERVAL '1 month') RETURNING id INTO order2_id;
    
    INSERT INTO sales_orders (company_id, customer_id, order_number, amount, status, created_at) VALUES 
        (first_company_id, cust3_id, 'SO-1003', 728000, 'Processing', NOW()) RETURNING id INTO order3_id;

    -- Insert Shipments
    INSERT INTO shipments (company_id, order_id, tracking_number, destination, status) VALUES 
        (first_company_id, order1_id, 'TRK-9901', 'Hamburg, DE', 'Delivered');
    INSERT INTO shipments (company_id, order_id, tracking_number, destination, status) VALUES 
        (first_company_id, order2_id, 'TRK-9902', 'Osaka, JP', 'In Transit');
    INSERT INTO shipments (company_id, order_id, tracking_number, destination, status) VALUES 
        (first_company_id, order3_id, 'TRK-9903', 'Mumbai, IN', 'Processing');

    -- Insert Notifications
    INSERT INTO app_notifications (company_id, type, title, body) VALUES 
        (first_company_id, 'success', 'Payment Received', 'USD 892,000 from Berlin Auto GmbH');
    INSERT INTO app_notifications (company_id, type, title, body) VALUES 
        (first_company_id, 'warning', 'Shipment Delay', 'TRK-9902 may be delayed by 2 days');

END $$;
