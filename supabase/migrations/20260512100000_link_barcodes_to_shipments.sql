-- ================================================================
-- Migration: Link batch_barcodes → export_shipments / export_containers
-- Also upgrades the scan_barcode() RPC to accept shipment linking
-- ================================================================

-- 1. Add FK columns to batch_barcodes
ALTER TABLE public.batch_barcodes
  ADD COLUMN IF NOT EXISTS shipment_id  UUID REFERENCES public.export_shipments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS container_id UUID REFERENCES public.export_containers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS batch_barcodes_shipment_idx
  ON public.batch_barcodes(shipment_id) WHERE shipment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS batch_barcodes_container_idx
  ON public.batch_barcodes(container_id) WHERE container_id IS NOT NULL;

-- 2. Drop old scan_barcode function (may have different signature)
DROP FUNCTION IF EXISTS public.scan_barcode(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.scan_barcode(TEXT, public.batch_location_enum);

-- 3. Create upgraded scan_barcode RPC
--    Old callers (2 params) still work: new params default to NULL
CREATE OR REPLACE FUNCTION public.scan_barcode(
  _code         TEXT,
  _new_location TEXT DEFAULT NULL,
  _shipment_id  UUID DEFAULT NULL,
  _container_id UUID DEFAULT NULL
)
RETURNS TABLE(
  barcode_id       UUID,
  code             TEXT,
  level            TEXT,
  box_number       INT,
  current_location TEXT,
  status           TEXT,
  scan_count       INT,
  batch_id         UUID,
  lot_number       TEXT,
  product_name     TEXT,
  grade            TEXT,
  warehouse_name   TEXT,
  farmer_name      TEXT,
  received_date    DATE,
  shipment_number  TEXT,
  container_number TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Find barcode
  SELECT bb.id INTO v_id
  FROM public.batch_barcodes bb
  WHERE bb.code = _code
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Barcode not found: %', _code;
  END IF;

  -- Update: increment scan, update location + shipment link
  UPDATE public.batch_barcodes
  SET
    scan_count       = COALESCE(scan_count, 0) + 1,
    last_scanned_at  = now(),
    current_location = COALESCE(_new_location, current_location),
    shipment_id      = COALESCE(_shipment_id,  shipment_id),
    container_id     = COALESCE(_container_id, container_id)
  WHERE id = v_id;

  -- Auto-log a shipment event when linked to a shipment
  IF _shipment_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.shipment_events(
        company_id, shipment_id, event_type, title, description
      )
      SELECT
        es.company_id,
        _shipment_id,
        'container_loaded',
        'Barcode scanned into shipment: ' || _code,
        CASE
          WHEN _container_id IS NOT NULL
          THEN 'Linked to container ' || (SELECT container_number FROM public.export_containers WHERE id = _container_id)
          ELSE 'Barcode linked via scan at ' || COALESCE(_new_location, 'unknown location')
        END
      FROM public.export_shipments es
      WHERE es.id = _shipment_id;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- don't break scan if shipment_events table not yet created
    END;
  END IF;

  -- Return enriched row
  RETURN QUERY
  SELECT
    bb.id,
    bb.code,
    bb.level,
    bb.box_number,
    bb.current_location,
    bb.status,
    bb.scan_count,
    bb.batch_id,
    ib.lot_number,
    p.name      AS product_name,
    ib.grade,
    w.name      AS warehouse_name,
    f.full_name AS farmer_name,
    ib.received_date,
    es.shipment_number,
    ec.container_number
  FROM public.batch_barcodes bb
  LEFT JOIN public.inventory_batches  ib ON ib.id = bb.batch_id
  LEFT JOIN public.products           p  ON p.id  = ib.product_id
  LEFT JOIN public.warehouses         w  ON w.id  = ib.warehouse_id
  LEFT JOIN public.farmers            f  ON f.id  = ib.farmer_id
  LEFT JOIN public.export_shipments   es ON es.id = bb.shipment_id
  LEFT JOIN public.export_containers  ec ON ec.id = bb.container_id
  WHERE bb.id = v_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
