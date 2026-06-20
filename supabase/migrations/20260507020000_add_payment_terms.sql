-- Add payment_terms column to export_orders and quotations tables
ALTER TABLE public.export_orders ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS payment_terms TEXT;
