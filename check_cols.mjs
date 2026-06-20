import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(line => {
  const [k, ...v] = line.split('=');
  return [k.trim(), v.join('=').trim().replace(/"/g, '')];
}));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) console.error("Error fetching customers:", error);
  else console.log("CUSTOMERS_COLS_ARE:", Object.keys(data[0] || {}));
  
  const { data: d2, error: e2 } = await supabase.from('farmers').select('*').limit(1);
  if (e2) console.error("Error farmers:", e2);
  else console.log("FARMERS_COLS_ARE:", Object.keys(d2[0] || {}));
}
run();
