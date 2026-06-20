import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        DROP POLICY IF EXISTS "Users can update own session" ON user_sessions;

        CREATE POLICY "Users can update own session"
        ON user_sessions FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

        DROP POLICY IF EXISTS "profiles_bde_select" ON profiles;

        CREATE POLICY "profiles_bde_select"
        ON profiles FOR SELECT
        TO authenticated
        USING (role ILIKE 'bde' AND company_id = current_company_id());
      `
  });
  
  if (error) {
    console.log("RPC failed:", error.message);
  } else {
    console.log("RLS policy applied successfully:", data);
  }
}
main();
