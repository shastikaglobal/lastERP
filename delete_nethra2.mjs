import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const targetEmail = 'n4923408@gmail.com';
  
  // 1. Get auth user
  const { data: { users }, error: listUserErr } = await supabase.auth.admin.listUsers();
  if (listUserErr) {
    console.error("Error listing users:", listUserErr);
    return;
  }
  
  const user = users.find(u => u.email === targetEmail);
  if (!user) {
    console.log(`User not found.`);
    return;
  }
  
  const userId = user.id;
  console.log(`Found auth user ${targetEmail} with ID: ${userId}`);
  
  // Try to safely delete records. 
  const queries = [
    supabase.from('user_roles').delete().eq('user_id', userId),
    supabase.from('user_sessions').delete().eq('user_id', userId),
    supabase.from('approval_audit_log').delete().eq('target_user_id', userId),
    supabase.from('approval_audit_log').delete().eq('actor_user_id', userId),
    // Setting NULL where possible
    supabase.from('purchase_orders').update({ created_by: null }).eq('created_by', userId),
    supabase.from('batch_barcodes').update({ created_by: null }).eq('created_by', userId),
    supabase.from('batch_barcodes').update({ last_scanned_by: null }).eq('last_scanned_by', userId),
    supabase.from('export_orders').update({ created_by: null }).eq('created_by', userId),
    supabase.from('qc_inspections').update({ inspector_id: null }).eq('inspector_id', userId),
    supabase.from('profiles').delete().eq('id', userId)
  ];

  for (let q of queries) {
    const { error } = await q;
    if (error) console.log("Error in related delete:", error.message);
  }

  // Delete from auth.users
  const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId);
  if (deleteErr) {
    console.error("Failed to delete auth user:", deleteErr);
  } else {
    console.log(`Successfully deleted auth user ${targetEmail}`);
  }
}

main().catch(console.error);
