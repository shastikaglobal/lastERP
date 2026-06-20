-- Enable Supabase Realtime on profiles and user_roles
-- so the frontend can subscribe to live changes when admin approves a user.

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;


