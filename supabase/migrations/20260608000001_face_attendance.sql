-- ============================================================
-- FACE ATTENDANCE MODULE - SUPABASE MIGRATION
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable pgvector extension for face embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLE 1: employees (extends your existing employee data)
-- ============================================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bio_id TEXT UNIQUE,
  department TEXT,
  role TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  face_embedding vector(128),        -- FaceNet 128-dim vector
  face_registered_at TIMESTAMPTZ,
  face_image_url TEXT,               -- Supabase Storage URL
  is_active BOOLEAN DEFAULT true,
  shift_start TIME DEFAULT '09:00',
  late_threshold_mins INTEGER DEFAULT 15,
  salary_cut_per_min NUMERIC(10,2) DEFAULT 5.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 2: attendance_logs (one row per day per employee)
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  punch_in TIMESTAMPTZ,
  punch_out TIMESTAMPTZ,
  method TEXT DEFAULT 'face_id',     -- 'face_id' | 'manual' | 'biometric'
  confidence_score NUMERIC(5,2),     -- 0.00 - 100.00
  liveness_passed BOOLEAN DEFAULT false,
  is_late BOOLEAN DEFAULT false,
  late_by_mins INTEGER DEFAULT 0,
  salary_cut NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'present',     -- 'present' | 'absent' | 'half_day' | 'leave'
  ip_address TEXT,
  device_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)          -- One record per employee per day
);

-- ============================================================
-- TABLE 3: face_scan_events (every scan attempt, pass or fail)
-- ============================================================
CREATE TABLE IF NOT EXISTS face_scan_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  match_score NUMERIC(5,2),
  liveness_score NUMERIC(5,2),
  motion_pass BOOLEAN DEFAULT false,
  blink_pass BOOLEAN DEFAULT false,
  depth_pass BOOLEAN DEFAULT false,
  spoof_pass BOOLEAN DEFAULT false,
  status TEXT NOT NULL,              -- 'matched' | 'failed' | 'spoof_detected' | 'no_face'
  face_snapshot_url TEXT,            -- Optional: store scan image
  error_reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE 4: shift_config
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_name TEXT NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  late_threshold_mins INTEGER DEFAULT 15,
  salary_cut_per_min NUMERIC(10,2) DEFAULT 5.00,
  apply_to_departments TEXT[],       -- e.g. ARRAY['Admin', 'BDE']
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default shift
INSERT INTO shift_config (shift_name, start_time, end_time, late_threshold_mins, salary_cut_per_min, is_default)
VALUES ('General Shift', '09:00', '18:00', 15, 5.00, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLE 5: leave_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT DEFAULT 'paid',    -- 'paid' | 'unpaid' | 'sick' | 'casual'
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',     -- 'pending' | 'approved' | 'rejected'
  approved_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_logs(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_face_scan_employee ON face_scan_events(employee_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_face_scan_status ON face_scan_events(status, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_employees_bio_id ON employees(bio_id);
-- Vector similarity index for fast face matching
CREATE INDEX IF NOT EXISTS idx_employees_face_embedding ON employees
  USING ivfflat (face_embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- VIEWS for easy reporting
-- ============================================================

-- Today's attendance summary
CREATE OR REPLACE VIEW today_attendance AS
SELECT
  e.id,
  e.name,
  e.bio_id,
  e.department,
  e.role,
  a.punch_in,
  a.punch_out,
  a.method,
  a.confidence_score,
  a.liveness_passed,
  a.is_late,
  a.late_by_mins,
  a.salary_cut,
  a.status,
  CASE WHEN a.id IS NULL THEN 'absent' ELSE a.status END AS attendance_status
FROM employees e
LEFT JOIN attendance_logs a ON a.employee_id = e.id AND a.date = CURRENT_DATE
WHERE e.is_active = true
ORDER BY a.punch_in ASC NULLS LAST;

-- Monthly attendance report
CREATE OR REPLACE VIEW monthly_report AS
SELECT
  e.id AS employee_id,
  e.name,
  e.department,
  DATE_TRUNC('month', a.date) AS month,
  COUNT(CASE WHEN a.status = 'present' THEN 1 END) AS present_days,
  COUNT(CASE WHEN a.is_late = true THEN 1 END) AS late_days,
  COUNT(CASE WHEN a.status = 'absent' THEN 1 END) AS absent_days,
  SUM(a.salary_cut) AS total_salary_cut,
  AVG(a.confidence_score) AS avg_face_confidence
FROM employees e
LEFT JOIN attendance_logs a ON a.employee_id = e.id
GROUP BY e.id, e.name, e.department, DATE_TRUNC('month', a.date);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function: Find matching employee by face vector
CREATE OR REPLACE FUNCTION match_face(
  query_embedding vector(128),
  match_threshold FLOAT DEFAULT 0.80,
  match_count INT DEFAULT 1
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  bio_id TEXT,
  department TEXT,
  role TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.bio_id,
    e.department,
    e.role,
    1 - (e.face_embedding <=> query_embedding) AS similarity
  FROM employees e
  WHERE e.is_active = true
    AND e.face_embedding IS NOT NULL
    AND 1 - (e.face_embedding <=> query_embedding) > match_threshold
  ORDER BY e.face_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: Mark attendance after successful face scan
CREATE OR REPLACE FUNCTION mark_attendance(
  p_employee_id UUID,
  p_confidence NUMERIC,
  p_liveness BOOLEAN,
  p_ip TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql AS $$
DECLARE
  v_shift shift_config%ROWTYPE;
  v_employee employees%ROWTYPE;
  v_is_late BOOLEAN := false;
  v_late_mins INTEGER := 0;
  v_salary_cut NUMERIC := 0;
  v_existing_log attendance_logs%ROWTYPE;
  v_result JSON;
BEGIN
  -- Get employee
  SELECT * INTO v_employee FROM employees WHERE id = p_employee_id;

  -- Get applicable shift
  SELECT * INTO v_shift FROM shift_config
  WHERE is_default = true OR v_employee.department = ANY(apply_to_departments)
  ORDER BY is_default DESC LIMIT 1;

  -- Check if already punched in today
  SELECT * INTO v_existing_log
  FROM attendance_logs
  WHERE employee_id = p_employee_id AND date = CURRENT_DATE;

  IF v_existing_log.id IS NOT NULL THEN
    -- Already punched in - mark punch out
    UPDATE attendance_logs
    SET punch_out = NOW()
    WHERE id = v_existing_log.id;

    RETURN json_build_object('action', 'punch_out', 'employee', v_employee.name);
  END IF;

  -- Check if late
  IF v_shift.id IS NOT NULL THEN
    v_late_mins := GREATEST(0,
      EXTRACT(EPOCH FROM (NOW()::TIME - v_shift.start_time)) / 60 - v_shift.late_threshold_mins
    )::INTEGER;
    v_is_late := v_late_mins > 0;
    v_salary_cut := v_late_mins * v_shift.salary_cut_per_min;
  END IF;

  -- Insert attendance record
  INSERT INTO attendance_logs (
    employee_id, date, punch_in, method,
    confidence_score, liveness_passed,
    is_late, late_by_mins, salary_cut,
    status, ip_address
  ) VALUES (
    p_employee_id, CURRENT_DATE, NOW(), 'face_id',
    p_confidence, p_liveness,
    v_is_late, v_late_mins, v_salary_cut,
    'present', p_ip
  );

  v_result := json_build_object(
    'action', 'punch_in',
    'employee', v_employee.name,
    'is_late', v_is_late,
    'late_by_mins', v_late_mins,
    'salary_cut', v_salary_cut
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE face_scan_events ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (your backend uses this)
CREATE POLICY "service_role_all" ON employees FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON attendance_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all" ON face_scan_events FOR ALL USING (auth.role() = 'service_role');

-- Authenticated users can read attendance
CREATE POLICY "auth_read_attendance" ON attendance_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_read_employees" ON employees FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKET for face images
-- ============================================================
-- Run this separately in Supabase Dashboard > Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('face-data', 'face-data', false);

-- ============================================================
-- SAMPLE DATA (optional - for testing)
-- ============================================================
INSERT INTO employees (name, bio_id, department, role, email, shift_start)
VALUES
  ('Gayathri', '1005', 'BDE', 'Business Dev Executive', 'gayathri@shastika.com', '09:00'),
  ('Jayasri S', '1003', 'Admin', 'Administrator', 'jayasri@shastika.com', '09:00'),
  ('Karunya', '1009', 'Admin', 'Administrator', 'karunya@shastika.com', '09:00'),
  ('Swathi Swathi', '1001', 'Admin', 'Admin Manager', 'swathi@shastika.com', '09:00')
ON CONFLICT (bio_id) DO NOTHING;

-- ============================================================
-- DONE! Next: Run 002_face_attendance_api.sql
-- ============================================================
