// Write current auth user to see who is logged in from a frontend perspective
// We can't do this easily with just a script since the user logs in via the browser.
// But we know there's a problem fetching products for the user.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(line => {
  const [k, ...v] = line.split('=');
  return [k.trim(), v.join('=').trim().replace(/"/g, '').replace(/\r$/, '')];
}));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkRLS() {
  const { data: companies } = await supabase.from('companies').select('id').limit(1);
  const companyId = companies[0]?.id;

  const { data, error } = await supabase
    .from('products')
    .select('id, name, is_active, company_id')
    .eq('is_active', true);
  
  console.log(`Using ANON KEY. Fetched products:`, data?.length);
  if (error) console.error("Error:", error);
}
checkRLS();
