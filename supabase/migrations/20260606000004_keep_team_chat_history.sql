-- Drop the pruning trigger so that team chat history is stored permanently.
DROP TRIGGER IF EXISTS prune_old_team_chat_trigger ON public.team_chat;
DROP FUNCTION IF EXISTS public.prune_old_team_chat();

-- Also drop the storage deletion trigger as previously discussed to prevent storage API errors.
DROP TRIGGER IF EXISTS delete_chat_attachment_trigger ON public.team_chat;
DROP FUNCTION IF EXISTS public.delete_chat_attachment_from_storage();
