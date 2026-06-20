-- MASTER SOFT DELETE MIGRATION
-- This script adds soft delete capability to ALL ERP tables consistently.

BEGIN;

DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY[
        'active_sessions', 'activities', 'app_notifications', 'attendance', 'attendance_logs', 
        'profiles', 'user_roles', 'available_stock', 'barcodes', 'bde_daily_reports', 'client_acquisition', 
        'corporate_subnets', 'crm_tasks', 'customers', 'damaged_stock', 'emails', 
        'employees', 'expiry_monitoring', 'export_orders', 'export_shipments', 
        'farmers', 'follow_ups', 'inventory_batches', 'leads', 'leave_requests', 
        'products', 'purchase_orders', 'quotation_items', 'quotations', 
        'sales_orders', 'screen_signals', 'shift_config', 'shipments', 
        'team_chat', 'user_sessions', 'warehouse_stock', 'warehouses', 
        'audit_logs', 'crm_audit_log', 'zoho_accounts'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false', t);
        EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS deleted_at timestamptz', t);
        EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS deleted_by uuid', t);
    END LOOP;
END $$;

-- Create a centralized soft delete function that can be called via RPC
CREATE OR REPLACE FUNCTION soft_delete_record(target_table text, target_id uuid, deleter_id uuid)
RETURNS boolean AS $$
BEGIN
    EXECUTE format('UPDATE %I SET is_deleted = true, deleted_at = now(), deleted_by = $1 WHERE id = $2', target_table)
    USING deleter_id, target_id;
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view filter helper if needed, or update RLS policies
-- Note: Manually updating RLS policies for 30+ tables is complex, 
-- but we should at least ensure the common pages filter by is_deleted = false.

COMMIT;
