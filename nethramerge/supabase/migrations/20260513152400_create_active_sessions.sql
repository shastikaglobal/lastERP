CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  profile_role TEXT,
  login_at TIMESTAMPTZ DEFAULT now(),
  last_active TIMESTAMPTZ DEFAULT now(),
  device_info TEXT
);
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Session access" ON active_sessions FOR ALL USING (true);
