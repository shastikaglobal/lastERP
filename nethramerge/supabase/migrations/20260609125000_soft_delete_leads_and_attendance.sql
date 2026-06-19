-- Leads: Drop the restricted delete policy so physical delete is blocked for everyone
DROP POLICY IF EXISTS leads_delete_policy ON public.leads;

-- Attendance Logs: Add is_deleted column if it doesn't exist
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Attendance Logs: Drop the "manage" policy that allowed DELETE
DROP POLICY IF EXISTS "Admins and managers can manage attendance" ON public.attendance_logs;

-- Re-create Admins and managers policies for SELECT, INSERT, UPDATE only (NO DELETE)
CREATE POLICY "Admins and managers can select attendance" ON public.attendance_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.slug IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can insert attendance" ON public.attendance_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.slug IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins and managers can update attendance" ON public.attendance_logs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.slug IN ('admin', 'manager')
        )
    );
