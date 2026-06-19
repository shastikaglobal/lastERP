-- Fix Row-Level Security for acquisition_channels
ALTER TABLE acquisition_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all" ON acquisition_channels;

CREATE POLICY "allow_all" ON acquisition_channels
FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
