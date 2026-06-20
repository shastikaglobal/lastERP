import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findTable() {
  const tableNames = ['quotation_items', 'quotation_lines', 'quotation_details', 'quote_items'];
  for (const name of tableNames) {
    const { error } = await supabase.from(name).select('*').limit(0);
    if (error) {
      console.log(`Table ${name}: MISSING (${error.message})`);
    } else {
      console.log(`Table ${name}: EXISTS`);
    }
  }
}

findTable();
