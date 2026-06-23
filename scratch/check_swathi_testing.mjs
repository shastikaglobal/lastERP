import { createClient } from '@supabase/supabase-js';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkSwathiTesting() {
  const { data, error } = await supabase
    .from('farmers')
    .select('id, full_name, company_id, is_active, is_deleted')
    .eq('id', '5dfc733b-8cb9-47bb-9f0a-b4c350efb0e4')
    .maybeSingle();

  if (error) {
    console.error("Error:", error.message);
    return;
  }

  console.log("swathi testing record in Supabase:", data);
}

checkSwathiTesting();
