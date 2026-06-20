-- Automation Triggers for Stock Movements

-- 1. Log Inbound when a new batch is created
CREATE OR REPLACE FUNCTION public.trg_log_new_batch() 
RETURNS TRIGGER AS $$
DECLARE
  _product_name TEXT;
  _warehouse_name TEXT;
BEGIN
  SELECT name INTO _product_name FROM public.products WHERE id = NEW.product_id;
  SELECT name INTO _warehouse_name FROM public.warehouses WHERE id = NEW.warehouse_id;
  
  PERFORM public.record_inventory_movement(
    NEW.company_id,
    _product_name,
    'in',
    NEW.quantity_kg,
    'LOT: ' || NEW.lot_number,
    _warehouse_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_batch_created ON public.inventory_batches;
CREATE TRIGGER on_batch_created
  AFTER INSERT ON public.inventory_batches
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_new_batch();

-- 2. Log Outbound when an export shipment is created
CREATE OR REPLACE FUNCTION public.trg_log_new_shipment() 
RETURNS TRIGGER AS $$
DECLARE
  _company_id UUID;
  _product_name TEXT;
  _qty NUMERIC;
BEGIN
  -- Get order details
  SELECT company_id, product, quantity INTO _company_id, _product_name, _qty 
  FROM public.export_orders WHERE id = NEW.order_id;
  
  PERFORM public.record_inventory_movement(
    _company_id,
    _product_name,
    'out',
    _qty,
    'SHP: ' || NEW.shipment_number,
    NEW.origin_port
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_shipment_created ON public.export_shipments;
CREATE TRIGGER on_shipment_created
  AFTER INSERT ON public.export_shipments
  FOR EACH ROW EXECUTE FUNCTION public.trg_log_new_shipment();
