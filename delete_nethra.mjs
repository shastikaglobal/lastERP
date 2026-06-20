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
    console.log(`User with email ${targetEmail} not found in auth.users.`);
    
    // Check if profile exists instead
    const { data: prof } = await supabase.from('profiles').select('id, email').eq('email', targetEmail).maybeSingle();
    if (prof) {
      console.log(`Found profile for ${targetEmail} with id ${prof.id}, deleting related records...`);
      await deleteRelated(prof.id);
      await supabase.from('profiles').delete().eq('id', prof.id);
      console.log("Deleted orphaned profile.");
    }
    return;
  }
  
  console.log(`Found auth user ${targetEmail} with ID: ${user.id}`);
  
  await deleteRelated(user.id);
  
  // Try deleting from public.profiles
  const { error: profileErr } = await supabase.from('profiles').delete().eq('id', user.id);
  if (profileErr) {
    console.warn("Failed to delete profile (maybe already gone):", profileErr.message);
  } else {
    console.log("Deleted from profiles.");
  }

  // Delete from auth.users
  const { error: deleteErr } = await supabase.auth.admin.deleteUser(user.id);
  if (deleteErr) {
    console.error("Failed to delete auth user:", deleteErr);
  } else {
    console.log(`Successfully deleted auth user ${targetEmail}`);
  }
}

async function deleteRelated(userId) {
  // Delete user_roles
  const { error: rErr } = await supabase.from('user_roles').delete().eq('user_id', userId);
  if (rErr) console.warn('user_roles:', rErr.message);
  
  // Delete user_sessions
  const { error: sErr } = await supabase.from('user_sessions').delete().eq('user_id', userId);
  if (sErr) console.warn('user_sessions:', sErr.message);
  
  // Delete approval_audit_log
  const { error: aErr1 } = await supabase.from('approval_audit_log').delete().eq('target_user_id', userId);
  if (aErr1) console.warn('approval_audit_log 1:', aErr1.message);
  const { error: aErr2 } = await supabase.from('approval_audit_log').delete().eq('actor_user_id', userId);
  if (aErr2) console.warn('approval_audit_log 2:', aErr2.message);

  // If there are other tables like batch_barcodes, purchase_orders, we can set them to NULL (if foreign keys allow)
  // Usually users is just user_roles, user_sessions, approval_audit_log.
}

main().catch(console.error);
