import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const targetEmail = 'n4923408@gmail.com';
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === targetEmail);
  if (!user) return;
  
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    fs.writeFileSync('err.log', JSON.stringify(error, null, 2));
    console.log("Logged error to err.log");
  } else {
    console.log("Success");
  }
}
main();
