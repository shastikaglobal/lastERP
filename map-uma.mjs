import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function mapUma() {
  console.log("Mapping biometric_id '1008' to uma parameshwari...");
  
  const { data, error } = await supabase
    .from('profiles')
    .update({ biometric_id: '1008' })
    .eq('id', 'f75da685-2a51-4b42-a804-b44fb296b639')
    .select();

  if (error) {
    console.error("❌ Failed to map profile:", error.message);
  } else {
    console.log("✅ Successfully mapped profile!", data);
  }
}

mapUma();
