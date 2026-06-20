-- Upgrade scan_barcode to return professional export fields
CREATE OR REPLACE FUNCTION public.scan_barcode(
  _code         TEXT,
  _new_location TEXT DEFAULT NULL,
  _shipment_id  UUID DEFAULT NULL,
  _container_id UUID DEFAULT NULL
)
RETURNS TABLE(
  barcode_id          UUID,
  code                TEXT,
  level               TEXT,
  box_number          INT,
  current_location    TEXT,
  status              TEXT,
  scan_count          INT,
  batch_id            UUID,
  lot_number          TEXT,
  product_name        TEXT,
  sku_code            TEXT,
  net_weight          DECIMAL(10,2),
  packing_date        DATE,
  carton_total        INT,
  grade               TEXT,
  warehouse_name      TEXT,
  farmer_name         TEXT,
  received_date       DATE,
  shipment_number     TEXT,
  container_number    TEXT,
  company_name        TEXT
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
    COALESCE(bb.sku_code, p.sku) AS sku_code,
    bb.net_weight,
    bb.packing_date,
    bb.carton_number_total AS carton_total,
    ib.grade,
    w.name      AS warehouse_name,
    f.full_name AS farmer_name,
    ib.received_date,
    es.shipment_number,
    ec.container_number,
    c.name      AS company_name
  FROM public.batch_barcodes bb
  LEFT JOIN public.inventory_batches  ib ON ib.id = bb.batch_id
  LEFT JOIN public.products           p  ON p.id  = ib.product_id
  LEFT JOIN public.warehouses         w  ON w.id  = ib.warehouse_id
  LEFT JOIN public.farmers            f  ON f.id  = ib.farmer_id
  LEFT JOIN public.export_shipments   es ON es.id = bb.shipment_id
  LEFT JOIN public.export_containers  ec ON ec.id = bb.container_id
  LEFT JOIN public.companies          c  ON c.id  = bb.company_id
  WHERE bb.id = v_id;
END;
$$;
