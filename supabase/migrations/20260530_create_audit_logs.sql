-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'export', 'login', 'logout', 'view'
  resource_type VARCHAR(100) NOT NULL, -- 'quotation', 'customer', 'order', 'payment', 'invoice', etc.
  resource_id UUID,
  resource_name VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success', -- 'success', 'failed'
  error_message TEXT,
  changes_count INT DEFAULT 0,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can view their own logs, admins can view all
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id OR (SELECT 'admin' = ANY(ARRAY(SELECT slug FROM roles INNER JOIN user_roles ON roles.id = user_roles.role_id WHERE user_roles.user_id = auth.uid()))) );

CREATE POLICY "Only authenticated users can insert logs" ON audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger to auto-populate user_id from auth
CREATE OR REPLACE FUNCTION set_audit_user_id() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_logs_set_user_id
  BEFORE INSERT ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_audit_user_id();
