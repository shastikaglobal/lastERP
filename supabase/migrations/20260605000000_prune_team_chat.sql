-- 1. Create function to prune old team chat messages (older than 24 hours)
CREATE OR REPLACE FUNCTION public.prune_old_team_chat()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft-delete messages older than 24 hours so chat history remains auditable
  UPDATE public.team_chat
  SET is_deleted = true,
      deleted_at = NOW(),
      deleted_by = NULL
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run pruning after a new message is inserted
DROP TRIGGER IF EXISTS prune_old_team_chat_trigger ON public.team_chat;
CREATE TRIGGER prune_old_team_chat_trigger
AFTER INSERT ON public.team_chat
FOR EACH STATEMENT
EXECUTE FUNCTION public.prune_old_team_chat();

-- 2. Create function to automatically delete chat attachments from Supabase storage when a message is deleted
CREATE OR REPLACE FUNCTION public.delete_chat_attachment_from_storage()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.file_url IS NOT NULL THEN
    -- Delete the object row from storage.objects table
    DELETE FROM storage.objects
    WHERE bucket_id = 'chat-attachments' AND name = OLD.file_url;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run storage cleanup after a chat message row is deleted
DROP TRIGGER IF EXISTS delete_chat_attachment_trigger ON public.team_chat;
CREATE TRIGGER delete_chat_attachment_trigger
AFTER DELETE ON public.team_chat
FOR EACH ROW
EXECUTE FUNCTION public.delete_chat_attachment_from_storage();
