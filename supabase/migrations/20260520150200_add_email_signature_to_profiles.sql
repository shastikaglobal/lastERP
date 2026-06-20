-- Add email_signature to profiles table for user-specific email signatures
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_signature TEXT;
