CREATE TABLE IF NOT EXISTS public.bde_daily_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bde_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id uuid,
    report_date date DEFAULT CURRENT_DATE,
    country text,
    total_calls integer DEFAULT 0,
    calls_attended integer DEFAULT 0,
    attended_names text,
    linkedin_messages integer DEFAULT 0,
    emails_sent integer DEFAULT 0,
    new_leads integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.bde_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports" ON public.bde_daily_reports
    FOR INSERT WITH CHECK (auth.uid() = bde_id);

CREATE POLICY "Admins and managers can view all reports" ON public.bde_daily_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.slug IN ('admin', 'manager')
        )
        OR auth.uid() = bde_id
    );
