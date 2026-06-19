import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkRoles() {
  console.log("Checking User Roles...");
  
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, email, status');
  if (pErr) console.error("Profile Error:", pErr);
  
  const { data: userRoles, error: urErr } = await supabase.from('user_roles').select('user_id, role_id, roles(slug)');
  if (urErr) console.error("User Roles Error:", urErr);
  
  console.log("---- PROFILES ----");
  console.log(profiles);
  console.log("---- USER ROLES ----");
  console.log(JSON.stringify(userRoles, null, 2));
}

checkRoles();
