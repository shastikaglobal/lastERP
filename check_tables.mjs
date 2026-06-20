import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sxebygxpjzntogzpjnga.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const tables = ['vehicles', 'drivers', 'shipment_vehicles', 'shipment_drivers', 'shipment_dispatches'];
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1);
    if (error) {
      console.log(`Table ${t} does NOT exist (or error):`, error.message);
    } else {
      console.log(`Table ${t} EXISTS!`);
    }
  }
}
check();
