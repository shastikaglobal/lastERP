import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].replace(/['"]/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfile() {
  const { data } = await supabase.from('profiles').select('*').ilike('full_name', '%Karunya%');
  console.log(JSON.stringify(data, null, 2));
}

checkProfile();
