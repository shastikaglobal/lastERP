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
  const { data: roles, error: rErr } = await supabase.from('roles').select('*');
  if (rErr) console.error("Error fetching roles:", rErr);
  else console.log("Roles:", JSON.stringify(roles, null, 2));

  const { data: userRoles, error: urErr } = await supabase.from('user_roles').select('*, roles(*)');
  if (urErr) console.error("Error fetching user_roles:", urErr);
  else console.log("User Roles:", JSON.stringify(userRoles, null, 2));
}

run();
