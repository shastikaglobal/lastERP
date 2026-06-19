-- Fix: Statement-level triggers in PL/pgSQL must return NULL, not NEW.
-- Returning NEW causes "record \"new\" is not assigned yet" error which blocks all inserts.
CREATE OR REPLACE FUNCTION public.prune_old_team_chat()
RETURNS TRIGGER AS $$
BEGIN
  -- Soft-delete messages older than 24 hours so history remains auditable
  UPDATE public.team_chat
  SET is_deleted = true,
      deleted_at = NOW(),
      deleted_by = NULL
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
