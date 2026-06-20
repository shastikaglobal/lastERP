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

async function checkSupabase() {
  const { data, error, count } = await supabase
    .from('farmers')
    .select('id, full_name, email, is_deleted', { count: 'exact' });

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log(`Farmers in Supabase (Count: ${count}):`);
  data.forEach(f => console.log(`- ID: ${f.id} | Name: ${f.full_name} | Email: ${f.email} | Deleted: ${f.is_deleted}`));
}

checkSupabase();
