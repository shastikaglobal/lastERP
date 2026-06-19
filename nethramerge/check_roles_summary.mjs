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
  const { data: userRoles, error } = await supabase
    .from('user_roles')
    .select('user_id, roles(slug)');
  
  if (error) console.error(error);
  else {
    const { data: profiles } = await supabase.from('profiles').select('id, email');
    userRoles.forEach(ur => {
      const p = profiles?.find(prof => prof.id === ur.user_id);
      console.log(`User: ${p?.email}, Role: ${ur.roles?.slug}`);
    });
  }
}

run();
