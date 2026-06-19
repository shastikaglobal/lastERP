import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deleteTestQuotations() {
  // Delete all quotations that start with "QT-VERIFY" or "TEST-"
  const { data, error, count } = await supabase
    .from("quotations")
    .delete({ count: 'exact' })
    .or("quotation_number.like.QT-VERIFY%,quotation_number.like.TEST%");

  if (error) {
    console.error("❌ Delete failed:", error.message);
  } else {
    console.log(`✅ Deleted ${count} test quotations.`);
  }
}

deleteTestQuotations();
