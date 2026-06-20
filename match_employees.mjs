import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const employeesToAdd = [
  { name: 'jayasri', email: 'sjayasri39@gmail.com' },
  { name: 'preethi', email: 'manager@shastikaglobalimpex.co.in' },
  { name: 'sathpreethika', email: 'sathpreethika5@gmail.com' },
  { name: 'uma parameshwari', email: 'parameshwariraj02@gmail.com' }
];

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('Current Profiles:', profiles.map(p => ({ name: p.full_name, email: p.email })));

  for (const emp of employeesToAdd) {
    const found = profiles.find(p => 
      (p.full_name && p.full_name.toLowerCase().includes(emp.name.toLowerCase())) || 
      (p.email && p.email.toLowerCase() === emp.email.toLowerCase())
    );

    if (found) {
      console.log(`MATCH FOUND: ${emp.name} matches existing profile ${found.full_name} (${found.email})`);
      // Update email if name matched but email was missing/different
      if (found.email !== emp.email) {
        console.log(`UPDATING email for ${found.full_name} to ${emp.email}`);
        await supabase.from('profiles').update({ email: emp.email }).eq('id', found.id);
      }
    } else {
      console.log(`NO MATCH: ${emp.name} (${emp.email}) not found in profiles.`);
    }
  }
}
run();
