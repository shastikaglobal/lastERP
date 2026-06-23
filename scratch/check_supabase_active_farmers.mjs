import { createClient } from '@supabase/supabase-js';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkActiveFarmers() {
  const { data, error } = await supabase
    .from('farmers')
    .select('id, full_name, company_id, is_active, is_deleted')
    .eq('is_deleted', false);

  if (error) {
    console.error("Error fetching from Supabase:", error.message);
    return;
  }

  console.log("Active Farmers in Supabase:");
  console.log(JSON.stringify(data, null, 2));
}

checkActiveFarmers();
