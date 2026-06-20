-- Run this to become an EMPLOYEE
UPDATE user_roles 
SET role_id = (SELECT id FROM roles WHERE slug = 'employee')
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'shastikaglobalimpexpvtltd@gmail.com');

-- =========================================================

-- Run this to become an ADMIN again
/*
UPDATE user_roles 
SET role_id = (SELECT id FROM roles WHERE slug = 'admin')
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'shastikaglobalimpexpvtltd@gmail.com');
*/

-- =========================================================

-- Run this to become a MANAGER
/*
UPDATE user_roles 
SET role_id = (SELECT id FROM roles WHERE slug = 'manager')
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'shastikaglobalimpexpvtltd@gmail.com');
*/
