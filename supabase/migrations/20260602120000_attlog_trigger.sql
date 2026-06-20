-- =====================================================================
-- Production Migration: Real-time AttLogs → attendance_logs
-- Table: "AttLogs" (exact name, case-sensitive)
-- Run this ONCE in Supabase SQL Editor
-- =====================================================================

-- ── Step 1: Prevent duplicate punches at the source ──
ALTER TABLE "AttLogs"
  ADD CONSTRAINT IF NOT EXISTS attlogs_unique_punch
  UNIQUE ("EmployeeCode", "LogDateTime");

-- ── Step 2: Create real-time trigger function ──
-- SECURITY DEFINER = runs as table owner, bypasses RLS on attendance_logs
CREATE OR REPLACE FUNCTION fn_attlog_to_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id  UUID;
  v_company_id  UUID;
  v_punch_utc   TIMESTAMPTZ;
  v_date        DATE;
BEGIN
  -- Device stores time in IST with no timezone marker → append +05:30 to get UTC
  v_punch_utc := (NEW."LogDateTime"::TEXT || '+05:30')::TIMESTAMPTZ;

  -- Compute the calendar date in IST (so midnight punches land on correct day)
  v_date := (v_punch_utc AT TIME ZONE 'Asia/Kolkata')::DATE;

  -- Match employee by biometric_id
  SELECT id, company_id
    INTO v_profile_id, v_company_id
    FROM profiles
   WHERE biometric_id = NEW."EmployeeCode"
   LIMIT 1;

  IF v_profile_id IS NULL THEN
    RAISE LOG '[AttLog] No profile for biometric_id: %', NEW."EmployeeCode";
    RETURN NEW;
  END IF;

  -- Atomic upsert: one record per employee per day
  -- Keeps EARLIEST clock_in and LATEST clock_out
  INSERT INTO attendance_logs (employee_id, company_id, date, status, clock_in, clock_out)
  VALUES (
    v_profile_id,
    v_company_id,
    v_date,
    'present',
    CASE WHEN NEW."Direction" IN ('in', '') THEN v_punch_utc ELSE NULL END,
    CASE WHEN NEW."Direction" = 'out'       THEN v_punch_utc ELSE NULL END
  )
  ON CONFLICT (employee_id, date) DO UPDATE SET
    status    = 'present',
    clock_in  = CASE
      WHEN NEW."Direction" IN ('in', '') THEN
        LEAST(COALESCE(attendance_logs.clock_in, v_punch_utc), v_punch_utc)
      ELSE
        attendance_logs.clock_in
    END,
    clock_out = CASE
      -- Explicit 'out' punch → keep latest
      WHEN NEW."Direction" = 'out' THEN
        GREATEST(COALESCE(attendance_logs.clock_out, v_punch_utc), v_punch_utc)
      -- Any punch 15+ min after clock_in → treat as clock_out
      WHEN attendance_logs.clock_in IS NOT NULL
       AND v_punch_utc > attendance_logs.clock_in + INTERVAL '15 minutes' THEN
        GREATEST(COALESCE(attendance_logs.clock_out, v_punch_utc), v_punch_utc)
      ELSE
        attendance_logs.clock_out
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- ── Step 3: Attach trigger to "AttLogs" ──
DROP TRIGGER IF EXISTS trg_attlog_to_attendance ON "AttLogs";

CREATE TRIGGER trg_attlog_to_attendance
  AFTER INSERT ON "AttLogs"
  FOR EACH ROW
  EXECUTE FUNCTION fn_attlog_to_attendance();

-- ── Verify ──
SELECT 'Trigger created successfully ✅' AS result;
