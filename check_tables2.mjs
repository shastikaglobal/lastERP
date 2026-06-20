import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sxebygxpjzntogzpjnga.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['vehicles', 'drivers', 'shipment_vehicles', 'shipment_drivers', 'shipment_dispatches', 'shipments'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('*').limit(1);
    if (!error) {
      console.log(`FOUND_TABLE:${t}`);
    } else if (error.code !== 'PGRST205') {
       console.log(`ERROR for ${t}: ${error.code} ${error.message}`);
    }
  }
  console.log("Check complete.");
}
check();
