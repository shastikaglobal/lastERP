import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.split('=').map(str => str.trim().replace(/"/g, ''))));

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase.from('companies').select('*').limit(1);
  if (error) console.error("Error fetching companies:", error);
  else console.log(Object.keys(data[0] || {}));
}

run();
