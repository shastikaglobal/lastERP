ALTER TABLE emails ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES zoho_accounts(id);
