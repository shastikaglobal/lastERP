import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkRoles() {
  const { data: userRoles, error: urErr } = await supabase.from('user_roles').select('*');
  const { data: roles, error: rErr } = await supabase.from('roles').select('*');
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, email');

  if (urErr || rErr || pErr) {
    console.error("Error:", urErr || rErr || pErr);
    return;
  }

  const mapped = userRoles.map(ur => {
    const role = roles.find(r => r.id === ur.role_id);
    const profile = profiles.find(p => p.id === ur.user_id);
    return {
      user_id: ur.user_id,
      full_name: profile?.full_name || 'Unknown',
      email: profile?.email || 'Unknown',
      role_name: role?.name || 'Unknown',
      role_slug: role?.slug || 'Unknown'
    };
  });

  console.log("Mapped User Roles:");
  console.table(mapped);
}

checkRoles();
