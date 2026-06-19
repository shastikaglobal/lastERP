import { createClient } from '@supabase/supabase-js';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log("⚡ Soft-deleting leads in Supabase (setting is_deleted = true)...");

  const { data, error } = await supabase
    .from('leads')
    .update({ is_deleted: true })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error("❌ Failed to soft-delete leads:", error.message);
  } else {
    console.log("✅ Successfully marked all leads as deleted.");
  }
}

run();
