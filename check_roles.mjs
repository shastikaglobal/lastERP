import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].replace(/['"]/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
  const { data } = await supabase.from('user_roles').select('*, roles(slug)').eq('user_id', 'f85f3f8f-61bd-4b9b-adbf-ca2c1f7699b4');
  console.log(JSON.stringify(data, null, 2));
}

checkRoles();
