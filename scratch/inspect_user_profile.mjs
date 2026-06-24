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

async function inspectUser() {
  const userId = '59df2897-02e4-4ab3-80ba-dc016642ba04';
  console.log(`Fetching profile from Supabase profiles table for ID: ${userId}...`);
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
    
  if (profErr) {
    console.error("Error fetching profile:", profErr.message);
  } else {
    console.log("Profile data:", profile);
  }
  
  console.log("Fetching roles from user_roles...");
  const { data: roles, error: rolesErr } = await supabase
    .from('user_roles')
    .select('*, roles(*)')
    .eq('user_id', userId);
    
  if (rolesErr) {
    console.error("Error fetching roles:", rolesErr.message);
  } else {
    console.log("User roles:", roles);
  }
}

inspectUser();
