import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').filter(l => l.includes('=')).reduce((a,c) => { 
  const [k,...v] = c.split('='); 
  a[k.trim()] = v.join('=').trim().replace(/\"/g, '').replace(/\r$/, ''); 
  return a; 
}, {}); 

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('warehouse_receivings').select('*').limit(1);
  console.log('warehouse_receivings:', data || error);
  process.exit(0);
}
check();
