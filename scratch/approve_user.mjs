import { createClient } from '@supabase/supabase-js';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function approveUser() {
  console.log("Fetching profile for karunyajothiprakash811@gmail.com...");
  const { data: profile, error: getError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'karunyajothiprakash811@gmail.com')
    .maybeSingle();

  if (getError) {
    console.error("Error fetching profile:", getError.message);
    return;
  }

  if (!profile) {
    console.error("Profile not found!");
    return;
  }

  console.log("Current profile:", profile);

  console.log("Updating profile status to approved and role to admin...");
  const { data, error: updateError } = await supabase
    .from('profiles')
    .update({ status: 'approved', role: 'admin' })
    .eq('id', profile.id)
    .select();

  if (updateError) {
    console.error("Error updating profile:", updateError.message);
  } else {
    console.log("Profile updated successfully:", data);
  }
}

approveUser();
