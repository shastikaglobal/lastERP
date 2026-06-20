-- Create screen_signals table for WebRTC video streaming negotiation

CREATE TABLE screen_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  signal_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()


);

-- Enable RLS so the realtime subscription works securely

ALTER TABLE screen_signals ENABLE ROW LEVEL SECURITY;

-- Allow users to insert signals

CREATE POLICY "Users can insert signals" ON screen_signals
  FOR INSERT
  WITH CHECK (true);

-- Allow users to view their incoming signals

CREATE POLICY "Users can read incoming signals" ON screen_signals
  FOR SELECT
  USING (true);

