import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Let's try running a simple query selecting everything from profiles
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching profiles with select *:', error);
  } else {
    console.log('Profile columns found in select *:', Object.keys(data[0] || {}));
  }

  // Let's try selecting specifically the fields from loadUserData
  const { data: data2, error: error2 } = await supabase
    .from('profiles')
    .select('id, company_id, full_name, email, avatar_url, status, requested_role, rejection_reason, phone, dob, joining_date, system_mode, city, biometric_id, department, employee_id, role')
    .limit(1);

  if (error2) {
    console.error('Error fetching profiles with specific loadUserData fields:', error2);
  } else {
    console.log('Success fetching specific fields!');
  }
}

main();
