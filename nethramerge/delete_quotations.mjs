import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deleteAllQuotations() {
  console.log("Attempting to delete all quotations...");
  
  // Delete all rows from quotations
  // Using .neq("id", "00000000-0000-0000-0000-000000000000") is a common trick to delete all rows 
  // since every ID will be different from this dummy UUID.
  const { data, error, count } = await supabase
    .from("quotations")
    .delete({ count: 'exact' })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) {
    console.error("❌ Delete failed:", error.message);
  } else {
    console.log(`✅ Success! Deleted ${count} quotations.`);
    console.log("Child items were automatically deleted due to CASCADE.");
  }
}

deleteAllQuotations();
