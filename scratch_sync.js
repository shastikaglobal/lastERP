import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://sxebygxpjzntogzpjnga.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4"
);

async function test() {
  const { data, error } = await supabase.from('emails').select('id, subject, company_id, account_id').limit(5);
  console.log("Anon Emails:", data, error);
}

test();
