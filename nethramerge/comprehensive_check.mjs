import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const idx = line.indexOf('=');
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      return [key, val];
    })
);

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const output = {};

  // 1. Roles
  const { data: roles } = await supabase.from('roles').select('id, name, slug').or('slug.ilike.bde,name.ilike.bde');
  output.bdeRoles = roles;

  // 2. User Roles
  const roleIds = roles.map(r => r.id);
  const { data: userRoles } = await supabase.from('user_roles').select('user_id, role_id').in('role_id', roleIds);
  output.userRolesCount = userRoles?.length;

  // 3. Profiles (those linked via user_roles)
  const userIds = userRoles?.map(ur => ur.user_id) || [];
  const { data: linkedProfiles } = await supabase.from('profiles').select('id, full_name, status, role, requested_role').in('id', userIds);
  output.linkedProfiles = linkedProfiles;

  // 4. Profiles (those with 'bde' in role/requested_role directly)
  const { data: columnProfiles } = await supabase.from('profiles').select('id, full_name, status, role, requested_role').or('role.ilike.bde,requested_role.ilike.bde');
  output.columnProfiles = columnProfiles;

  fs.writeFileSync('comprehensive_bde_check.json', JSON.stringify(output, null, 2));
}

run();
