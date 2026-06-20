-- Fix "Batch not found" error when generating barcodes for Shipments
-- This migration relaxes the NOT NULL constraint on batch_id and updates the QC trigger

-- 1. Make batch_id nullable to allow shipment-level barcodes
ALTER TABLE public.batch_barcodes ALTER COLUMN batch_id DROP NOT NULL;

-- 2. Update the QC check trigger function to skip check if batch_id is null
CREATE OR REPLACE FUNCTION public.enforce_qc_approved_for_barcode()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _batch_status public.batch_status;
  _has_approved_qc boolean;
BEGIN
  -- If there is no batch_id (e.g. it's a shipment-level barcode), skip the QC check
  IF NEW.batch_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status INTO _batch_status FROM public.inventory_batches WHERE id = NEW.batch_id;
  
  -- If batch_id is provided but not found in DB
  IF _batch_status IS NULL THEN
    RAISE EXCEPTION 'Batch not found';
  END IF;

  -- A batch is barcodable if the batch itself is approved OR a QC inspection
  -- with result = approved exists for it.
  SELECT (
    _batch_status = 'approved'
    OR EXISTS (
      SELECT 1 FROM public.qc_inspections
      WHERE batch_id = NEW.batch_id AND result = 'approved'
    )
  ) INTO _has_approved_qc;

  IF NOT _has_approved_qc THEN
    RAISE EXCEPTION 'Cannot generate barcode: batch is not QC-approved';
  END IF;

  RETURN NEW;
END $$;

-- Refresh the PostgREST cache
NOTIFY pgrst, 'reload schema';
