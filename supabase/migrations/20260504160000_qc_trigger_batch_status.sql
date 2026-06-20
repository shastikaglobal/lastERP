-- Create a function to automatically update the batch status when QC inspection is done
CREATE OR REPLACE FUNCTION public.handle_qc_inspection()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.result = 'approved' THEN
    UPDATE public.inventory_batches
    SET status = 'approved',
        grade = NEW.grade
    WHERE id = NEW.batch_id;
  ELSIF NEW.result = 'rejected' THEN
    UPDATE public.inventory_batches
    SET status = 'rejected',
        grade = NEW.grade
    WHERE id = NEW.batch_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on qc_inspections table
DROP TRIGGER IF EXISTS trg_qc_inspection_update_batch ON public.qc_inspections;
CREATE TRIGGER trg_qc_inspection_update_batch
  AFTER INSERT OR UPDATE ON public.qc_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_qc_inspection();
