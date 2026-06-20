-- =========================================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) SETUP
-- =========================================================================

-- 1. Create the Roles system if it doesn't exist
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- 2. Insert Standard Roles
DO $$
DECLARE
    default_company_id UUID;
BEGIN
    SELECT id INTO default_company_id FROM companies LIMIT 1;
    
    IF default_company_id IS NOT NULL THEN
        INSERT INTO roles (name, slug, company_id)
        SELECT 'Administrator', 'admin', default_company_id WHERE NOT EXISTS (SELECT 1 FROM roles WHERE slug = 'admin');

        INSERT INTO roles (name, slug, company_id)
        SELECT 'Manager', 'manager', default_company_id WHERE NOT EXISTS (SELECT 1 FROM roles WHERE slug = 'manager');

        INSERT INTO roles (name, slug, company_id)
        SELECT 'Employee', 'employee', default_company_id WHERE NOT EXISTS (SELECT 1 FROM roles WHERE slug = 'employee');
    END IF;
END $$;

-- 3. Automatically make the first user an Admin (So you can test it!)
DO $$
DECLARE
    first_user_id UUID;
    admin_role_id UUID;
BEGIN
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO admin_role_id FROM roles WHERE slug = 'admin' LIMIT 1;
    
    IF first_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = first_user_id AND role_id = admin_role_id) THEN
            INSERT INTO user_roles (user_id, role_id) 
            VALUES (first_user_id, admin_role_id);
        END IF;
    END IF;
END $$;

-- 4. Enable Row Level Security (RLS) on Shipments
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- 5. Create Security Policies
-- Policy A: Everyone can READ shipments (so the dashboard works for all employees)
DROP POLICY IF EXISTS "Allow all users to read shipments" ON shipments;
CREATE POLICY "Allow all users to read shipments"
ON shipments FOR SELECT
USING (true);

-- Policy B: Only Admins and Managers can UPDATE shipments
DROP POLICY IF EXISTS "Allow Admins and Managers to update shipments" ON shipments;
CREATE POLICY "Allow Admins and Managers to update shipments"
ON shipments FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM user_roles 
    JOIN roles ON roles.id = user_roles.role_id 
    WHERE roles.slug IN ('admin', 'manager')
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM user_roles 
    JOIN roles ON roles.id = user_roles.role_id 
    WHERE roles.slug IN ('admin', 'manager')
  )
);

-- Note: In a true production environment, you would apply similar policies to `sales_orders`, `customers`, etc.
