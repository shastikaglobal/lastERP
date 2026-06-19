ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temp_allow_all" ON user_sessions
FOR ALL USING (true) WITH CHECK (true);
