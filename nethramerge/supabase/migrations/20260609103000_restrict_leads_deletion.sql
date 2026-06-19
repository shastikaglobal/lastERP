-- Drop the existing delete policy for leads
DROP POLICY IF EXISTS leads_delete_policy ON public.leads;

-- Create a restricted delete policy for leads
-- This ensures only authenticated users who are Admins or Managers can delete leads
CREATE POLICY leads_delete_policy ON public.leads
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.current_company_id()
    AND auth.uid() IN (
      SELECT ur.user_id 
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id 
      WHERE r.slug IN ('admin', 'manager')
    )
  );
