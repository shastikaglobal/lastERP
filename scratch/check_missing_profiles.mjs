import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')]; })
);

// We need service role key to access auth schema
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  // Fetch all users from auth.users (via supabase auth admin API)
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error listing users:', authError);
    return;
  }

  // Fetch all profiles
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, email, full_name');

  if (profError) {
    console.error('Error fetching profiles:', profError);
    return;
  }

  const profileIds = new Set(profiles.map(p => p.id));

  console.log(`Found ${users.length} users in auth.users and ${profiles.length} profiles in public.profiles.`);
  
  console.log('\nUsers missing a profile row:');
  let missingCount = 0;
  for (const u of users) {
    if (!profileIds.has(u.id)) {
      console.log(` - ID: ${u.id} | Email: ${u.email} | Created At: ${u.created_at}`);
      missingCount++;
    }
  }

  if (missingCount === 0) {
    console.log('None! All users have a profile row.');
  }
}

main();
