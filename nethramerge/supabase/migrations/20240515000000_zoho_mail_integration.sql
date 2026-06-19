-- 1. Create zoho_accounts table to store OAuth tokens
CREATE TABLE IF NOT EXISTS zoho_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  account_email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expiry_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, account_email)
);

-- 2. Create emails table to store synced messages
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  zoho_message_id TEXT UNIQUE,
  subject TEXT,
  from_address TEXT,
  to_address TEXT,
  body_html TEXT,
  body_text TEXT,
  received_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT FALSE,
  folder TEXT DEFAULT 'inbox', -- inbox, sent, draft, trash
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create email_attachments table
CREATE TABLE IF NOT EXISTS email_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create email_logs for auditing
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  action TEXT, -- 'send', 'sync', 'delete'
  status TEXT, -- 'success', 'error'
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE zoho_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- CREATE POLICY "Users can view their company zoho accounts" 
-- ON zoho_accounts FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- CREATE POLICY "Users can view their company emails" 
-- ON emails FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
