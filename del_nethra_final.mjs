import { createClient } from '@supabase/supabase-js';

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
  
  const userId = user.id;
  
  // Set approved_by to null
  await supabase.from('profiles').update({ approved_by: null }).eq('approved_by', userId);
  
  // Also check if there's any file in storage created by this user?
  // Storage doesn't strictly enforce FKs to users the same way.

  // Let's retry delete
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.log("Delete auth user still failed:", error);
  } else {
    console.log("SUCCESSFULLY deleted user!");
  }
}
main();
