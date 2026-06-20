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
  const names = ["gayathri", "vemula"];
  for (const name of names) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, status, role, requested_role')
      .ilike('full_name', `%${name}%`);
    
    console.log(`User: ${name}`, JSON.stringify(data, null, 2));
  }
}

run();
