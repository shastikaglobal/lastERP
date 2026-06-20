import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAmount() {
  const { error } = await supabase.from('quotations').select('amount').limit(1);
  if (error) {
    console.log("Error selecting amount:", error.message);
  } else {
    console.log("Amount column exists!");
  }
  
  const { error: error2 } = await supabase.from('quotations').select('total_amount').limit(1);
  if (error2) {
    console.log("Error selecting total_amount:", error2.message);
  } else {
    console.log("total_amount column exists!");
  }
}

testAmount();
