-- Migration to add SMTP and email integration columns to companies table
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS smtp_host text,
ADD COLUMN IF NOT EXISTS smtp_port text,
ADD COLUMN IF NOT EXISTS smtp_user text,
ADD COLUMN IF NOT EXISTS smtp_pass text,
ADD COLUMN IF NOT EXISTS from_email text;
