-- Fix RLS Policies for BDE Daily Reports
-- This migration ensures authenticated users can insert and select reports correctly.

-- 1. Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.bde_daily_reports;
DROP POLICY IF EXISTS "Admins and managers can view all reports" ON public.bde_daily_reports;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.bde_daily_reports;
DROP POLICY IF EXISTS "Allow authenticated select" ON public.bde_daily_reports;
DROP POLICY IF EXISTS "Allow authenticated delete" ON public.bde_daily_reports;

-- 2. Create the requested INSERT policy
CREATE POLICY "Allow authenticated insert"
ON public.bde_daily_reports
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Create a more permissive SELECT policy for authenticated users
CREATE POLICY "Allow authenticated select"
ON public.bde_daily_reports
FOR SELECT
TO authenticated
USING (true);

-- 4. Block physical DELETE and enforce soft-delete semantics instead
CREATE POLICY "Allow authenticated delete"
ON public.bde_daily_reports
FOR DELETE
TO authenticated
USING (false);

-- 5. Notify to reload schema
NOTIFY pgrst, 'reload schema';
