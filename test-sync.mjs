import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSync() {
  console.log("Fetching Zoho accounts...");
  const { data: accounts, error: accError } = await supabase
    .from("zoho_accounts")
    .select("*");

  if (accError) {
    console.error("Error fetching accounts:", accError);
    return;
  }

  if (!accounts || accounts.length === 0) {
    console.log("No Zoho accounts found in the database.");
    return;
  }

  console.log(`Found ${accounts.length} accounts. Testing sync for: ${accounts[0].account_email}`);
  
  const { data, error } = await supabase.functions.invoke("sync-zoho-emails", {
    body: { accountId: accounts[0].id }
  });

  if (error) {
    console.error("Supabase Edge Function Invoke Error:", error);
  } else {
    console.log("Response from Edge Function:", data);
  }
}

testSync();
