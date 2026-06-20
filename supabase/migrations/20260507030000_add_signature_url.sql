-- Add signature_url to companies table for digital seal and signature
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS signature_url TEXT;
