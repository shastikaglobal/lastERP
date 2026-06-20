import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

const env = dotenv.parse(readFileSync('.env'));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const employeesToAdd = [
  { name: 'jayasri', email: 'sjayasri39@gmail.com' },
  { name: 'preethi', email: 'manager@shastikaglobalimpex.co.in' },
  { name: 'sathpreethika', email: 'sathpreethika5@gmail.com' },
  { name: 'uma parameshwari', email: 'parameshwariraj02@gmail.com' }
];

async function run() {
  const { data: existingProfiles } = await supabase.from('profiles').select('full_name, email');
  console.log('Existing profiles:', existingProfiles);

  for (const emp of employeesToAdd) {
    const existing = existingProfiles?.find(p => p.full_name?.toLowerCase() === emp.name.toLowerCase() || p.email?.toLowerCase() === emp.email.toLowerCase());
    if (existing) {
      console.log(`Employee ${emp.name} already exists. Updating email to ${emp.email} if needed.`);
      if (existing.e !== emp.email) {
        // Update logic here if needed
      }
    } else {
      console.log(`Employee ${emp.name} (${emp.email}) NOT found. We should invite them.`);
    }
  }
}
run();
