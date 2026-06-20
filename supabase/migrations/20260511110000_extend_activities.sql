-- Add content column to activities for rich email body storage
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS subject TEXT;
