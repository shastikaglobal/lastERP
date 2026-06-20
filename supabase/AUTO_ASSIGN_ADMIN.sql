-- =========================================================================
-- AUTO ASSIGN ADMIN ROLE TO ALL NEW & EXISTING USERS
-- Run this in your Supabase SQL Editor!
-- =========================================================================

-- 1. Create a function that automatically assigns the Admin role
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  -- Get the admin role ID
  SELECT id INTO admin_role_id FROM public.roles WHERE slug = 'admin' LIMIT 1;
  
  -- If admin role exists, assign it to the new user
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (new.id, admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users so any NEW email automatically gets the role
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_role();

-- 3. Also fix any EXISTING users (like your GitHub account) who don't have a role yet
INSERT INTO public.user_roles (user_id, role_id)
SELECT auth.users.id, (SELECT id FROM roles WHERE slug = 'admin' LIMIT 1)
FROM auth.users
LEFT JOIN user_roles ON user_roles.user_id = auth.users.id
WHERE user_roles.id IS NULL;
