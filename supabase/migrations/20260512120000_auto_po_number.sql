-- Create sequence for PO numbers
CREATE SEQUENCE IF NOT EXISTS purchase_order_number_seq;

-- Function to generate PO number
CREATE OR REPLACE FUNCTION fn_generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(NEXTVAL('purchase_order_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign PO number
DROP TRIGGER IF EXISTS tr_auto_generate_po_number ON purchase_orders;
CREATE TRIGGER tr_auto_generate_po_number
BEFORE INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION fn_generate_po_number();
