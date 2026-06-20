-- Ensure team_chat is in the realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'team_chat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_chat;
  END IF;
END $$;
