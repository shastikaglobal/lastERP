-- Drop the trigger and function that attempts direct deletion from storage.objects
-- Supabase blocks direct manipulation of storage tables via SQL.
-- Storage cleanup should instead be handled by a client script, Edge Function, or pg_net calling the Storage API.

DROP TRIGGER IF EXISTS delete_chat_attachment_trigger ON public.team_chat;
DROP FUNCTION IF EXISTS public.delete_chat_attachment_from_storage();
