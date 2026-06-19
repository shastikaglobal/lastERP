-- Migration to add CC and BCC columns to the emails table
ALTER TABLE public.emails
ADD COLUMN IF NOT EXISTS cc_address TEXT,
ADD COLUMN IF NOT EXISTS bcc_address TEXT;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
