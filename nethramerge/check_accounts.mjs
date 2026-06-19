import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].replace(/['"]/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccounts() {
  const { data } = await supabase.from('zoho_accounts').select('*');
  console.log(JSON.stringify(data, null, 2));
}

checkAccounts();
