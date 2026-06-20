import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(line => {
  const [k, ...v] = line.split('=');
  return [k.trim(), v.join('=').trim().replace(/"/g, '')];
}));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) console.error("Error fetching products:", error);
  else console.log("PRODUCTS_COLS_ARE:", data.length > 0 ? Object.keys(data[0]) : "No rows, but query succeeded");
}
run();
