import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findReferences(userId) {
  // Let's check common tables
  const tables = [
    { name: 'profiles', column: 'id' },
    { name: 'user_roles', column: 'user_id' },
    { name: 'user_sessions', column: 'user_id' },
    { name: 'approval_audit_log', column: 'target_user_id' },
    { name: 'approval_audit_log', column: 'actor_user_id' },
    { name: 'purchase_orders', column: 'created_by' },
    { name: 'batch_barcodes', column: 'created_by' },
    { name: 'batch_barcodes', column: 'last_scanned_by' },
    { name: 'export_orders', column: 'created_by' },
    { name: 'qc_inspections', column: 'inspector_id' },
    { name: 'customers', column: 'created_by' },
    { name: 'leads', column: 'assigned_to' }, // might be UUID
  ];

  for (let t of tables) {
    const { data, error } = await supabase.from(t.name).select('*').eq(t.column, userId).limit(1);
    if (error) {
      if (error.code !== '42703') { // ignore column does not exist
         console.log(`Error checking ${t.name}.${t.column}:`, error.message);
      }
    } else if (data && data.length > 0) {
      console.log(`Found reference in ${t.name}.${t.column}`);
      // delete it
      console.log(`Deleting reference in ${t.name}.${t.column}...`);
      await supabase.from(t.name).delete().eq(t.column, userId);
    }
  }
}

async function main() {
  const targetEmail = 'n4923408@gmail.com';
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === targetEmail);
  if (!user) {
    console.log("User not found.");
    return;
  }
  
  console.log(`Found user ID: ${user.id}`);
  await findReferences(user.id);
  
  // Also check if they created any companies or something?
  // Let's retry delete
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) {
    console.log("Delete auth user still failed:", error);
  } else {
    console.log("SUCCESSFULLY deleted user!");
  }
}
main();
