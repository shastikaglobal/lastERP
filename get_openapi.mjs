import fs from 'fs';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co/rest/v1/";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

async function main() {
  const res = await fetch(SUPABASE_URL, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY
    }
  });
  const data = await res.json();
  fs.writeFileSync('openapi.json', JSON.stringify(data, null, 2));
  console.log("Written openapi.json");
}
main();
