import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(line => {
  const [k, ...v] = line.split('=');
  return [k.trim(), v.join('=').trim().replace(/"/g, '').replace(/\r$/, '')];
}));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: companies } = await supabase.from('companies').select('id').limit(1);
  const companyId = companies[0].id;

  const { data, error } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', true)
    .eq('company_id', companyId);

  console.log(`Found ${data.length} active products for company.`);
}
run();
