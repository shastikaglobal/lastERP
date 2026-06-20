import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  "https://sxebygxpjzntogzpjnga.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4"
);

async function check() {
  const { data, error } = await supabase.from('quotations').select('*').limit(1);
  console.log("Data:", data ? Object.keys(data[0]) : null);
  console.log("Error:", error);
}

check();
