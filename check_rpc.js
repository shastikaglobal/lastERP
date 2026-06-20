import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  "https://sxebygxpjzntogzpjnga.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI"
);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { sql: 'SELECT 1' });
  console.log("exec_sql:", data, error);
}

check();
