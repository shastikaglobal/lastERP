-- Run this in your Supabase SQL Editor to add Order ID tracking to Barcodes
ALTER TABLE public.batch_barcodes ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.export_orders(id) ON DELETE CASCADE;
