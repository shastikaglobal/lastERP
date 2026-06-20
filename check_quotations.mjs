import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://sxebygxpjzntogzpjnga.supabase.co";
const supabaseAnon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";
const supabaseService = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

const anonClient = createClient(supabaseUrl, supabaseAnon);
const serviceClient = createClient(supabaseUrl, supabaseService);

async function check() {
  console.log("Checking via ANON KEY:");
  const { data: anonData, error: anonErr } = await anonClient.from('quotations').select('id').limit(5);
  console.log("Anon Data:", anonData, "Error:", anonErr?.message);

  console.log("Checking via SERVICE KEY:");
  const { data: serviceData, error: serviceErr } = await serviceClient.from('quotations').select('id').limit(5);
  console.log("Service Data:", serviceData, "Error:", serviceErr?.message);
}
check();
