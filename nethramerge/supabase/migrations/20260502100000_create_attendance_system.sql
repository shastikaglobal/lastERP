-- Create attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'half_day', 'on_leave');

-- Create attendance_logs table
CREATE TABLE public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status public.attendance_status NOT NULL DEFAULT 'present',
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(employee_id, date) -- One record per employee per day
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_logs

-- 1. Employees can view their own attendance
CREATE POLICY "Users can view own attendance"
    ON public.attendance_logs FOR SELECT
    USING (auth.uid() = employee_id);

-- 2. Admins and Managers can view all attendance in their company
CREATE POLICY "Admins and managers can view all attendance"
    ON public.attendance_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.slug IN ('admin', 'manager')
        )
    );

-- 3. Employees can insert their own attendance (Punch In)
CREATE POLICY "Users can insert own attendance"
    ON public.attendance_logs FOR INSERT
    WITH CHECK (auth.uid() = employee_id);

-- 4. Employees can update their own attendance (Punch Out)
CREATE POLICY "Users can update own attendance"
    ON public.attendance_logs FOR UPDATE
    USING (auth.uid() = employee_id);

-- 5. Admins and Managers can manage all attendance
CREATE POLICY "Admins and managers can manage attendance"
    ON public.attendance_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() 
            AND r.slug IN ('admin', 'manager')
        )
    );

-- Function to handle updated_at
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON public.attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
