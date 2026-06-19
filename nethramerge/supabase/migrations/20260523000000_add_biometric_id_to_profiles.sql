-- Add biometric_id for eSSL machine integration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS biometric_id VARCHAR(50);
