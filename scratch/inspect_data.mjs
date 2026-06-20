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

  console.log("🌾 Farmers in Supabase:");
  const { data: farmers } = await supabase.from('farmers').select('id, full_name, phone, location');
  (farmers || []).forEach(f => console.log(`  - ${f.full_name} (${f.phone || 'No phone'}) - Location: ${f.location || 'N/A'}`));

  console.log("\n💼 Leads in Supabase:");
  const { data: leads } = await supabase.from('leads').select('id, company_name, contact_name, stage');
  (leads || []).forEach(l => console.log(`  - Company: ${l.company_name} | Contact: ${l.contact_name} | Stage: ${l.stage}`));
}

run();
