-- Migration to fix PostgreSQL type mismatch error: "COALESCE types text and uuid cannot be matched"
-- in public.trg_log_lead_changes(), public.trg_log_export_order_changes(), and public.trg_log_export_shipment_changes()

-- 1. Fix public.trg_log_lead_changes()
CREATE OR REPLACE FUNCTION public.trg_log_lead_changes()
RETURNS TRIGGER AS $$
DECLARE
  _lead_name TEXT;
BEGIN
  -- Cast NEW.id (UUID) to TEXT inside COALESCE
  _lead_name := COALESCE(NEW.company_name, NEW.contact_name, NEW.id::text);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('LEAD', 'Created lead ' || _lead_name, NEW.company_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    PERFORM public.log_activity('LEAD', 'Updated lead ' || _lead_name || ' stage to ' || NEW.stage, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix public.trg_log_export_order_changes()
CREATE OR REPLACE FUNCTION public.trg_log_export_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  _inv_num TEXT;
BEGIN
  -- Cast NEW.id (UUID) to TEXT inside COALESCE
  _inv_num := COALESCE(NEW.order_number, NEW.id::text);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('INVOICE', 'Created invoice ' || _inv_num, NEW.company_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity('INVOICE', 'Updated invoice ' || _inv_num || ' status to ' || NEW.status, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix public.trg_log_export_shipment_changes()
CREATE OR REPLACE FUNCTION public.trg_log_export_shipment_changes()
RETURNS TRIGGER AS $$
DECLARE
  _ship_num TEXT;
BEGIN
  -- Cast NEW.id (UUID) to TEXT inside COALESCE
  _ship_num := COALESCE(NEW.shipment_number, NEW.id::text);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity('SHIPMENT', 'Created export shipment ' || _ship_num, NEW.company_id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_activity('SHIPMENT', 'Marked shipment ' || _ship_num || ' as ' || NEW.status, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
