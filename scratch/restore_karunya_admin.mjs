import { createClient } from '@supabase/supabase-js';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://sxebygxpjzntogzpjnga.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function restoreUser() {
  const userId = 'f85f3f8f-61bd-4b9b-adbf-ca2c1f7699b4';
  console.log(`Restoring profile in Supabase profiles table for ID: ${userId}...`);
  
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .update({
      is_deleted: false,
      is_active: true,
      status: 'approved',
      requested_role: 'admin',
      role: 'admin',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select();
    
  if (profErr) {
    console.error("Error updating profile:", profErr.message);
  } else {
    console.log("Updated Profile:", prof);
  }
  
  console.log("Adding admin role in user_roles...");
  const { data: roleAssigned, error: roleErr } = await supabase
    .from('user_roles')
    .insert([{
      user_id: userId,
      role_id: 'b675a3ec-d55c-4c89-962b-2c38b0b335ee', // Admin role id
      is_deleted: false
    }])
    .select();
    
  if (roleErr) {
    console.warn("Role assignment warning (it might already exist or had issues):", roleErr.message);
  } else {
    console.log("Role Assigned:", roleAssigned);
  }
}

restoreUser();
