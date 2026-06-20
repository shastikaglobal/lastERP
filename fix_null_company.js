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

// We need the service role key to bypass RLS, but if ANON KEY has access, we can try.
// Usually, we can't update another user's profile with Anon Key.
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY; 
// Actually, I should use service role key, but let's see if it's in .env
const adminClient = createClient(
  env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'MISSING_KEY'
);

async function run() {
  const { data, error } = await supabase.from('profiles').select('*').is('company_id', null);
  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }
  
  console.log("Profiles with NULL company:", data);

  for (const profile of data) {
    console.log(`Fixing company_id for ${profile.email}...`);
    // I will use an RPC function if available, or just directly update.
    // If we have an existing RPC function or trigger that can help...
  }
}

run();
