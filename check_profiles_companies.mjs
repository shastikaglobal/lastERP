import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(line => {
  const [k, ...v] = line.split('=');
  return [k.trim(), v.join('=').trim().replace(/"/g, '').replace(/\r$/, '')];
}));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, email, company_id, role');
  if (error) {
    console.error("Error:", error);
    return;
  }
  console.log("Profiles:");
  profiles.forEach(p => console.log(`Email: ${p.email}, Role: ${p.role}, Company ID: ${p.company_id}`));

  const { data: companies } = await supabase.from('companies').select('id, name');
  console.log("\nCompanies:");
  companies.forEach(c => console.log(`${c.name} (${c.id})`));
}
check();
