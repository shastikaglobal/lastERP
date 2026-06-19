import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const env = dotenv.parse(readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL || env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkKarunya() {
  const { data } = await supabase.from('profiles').select('id, full_name, email').ilike('full_name', '%karunya%');
  console.log(data);
}

checkKarunya();
