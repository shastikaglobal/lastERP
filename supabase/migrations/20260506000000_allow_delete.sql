-- Add DELETE policies to allow the cleanup script to work
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_delete_quotations" ON public.quotations
  FOR DELETE USING (false);

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_delete_items" ON public.quotation_items
  FOR DELETE USING (false);
