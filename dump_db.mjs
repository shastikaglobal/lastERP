import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: leads } = await supabase.from('leads').select('id, company_name, country, stage');
  const { data: quotes } = await supabase.from('quotations').select('id, quotation_number, amount, total_amount, status, lead_id');
  const { data: activities } = await supabase.from('activities').select('id, title, type');

  const output = {
    leads: leads || [],
    quotes: quotes || [],
    activities: activities || []
  };

  fs.writeFileSync('db_dump.json', JSON.stringify(output, null, 2));
  console.log("Dumped DB to db_dump.json");
}

main().catch(console.error);
