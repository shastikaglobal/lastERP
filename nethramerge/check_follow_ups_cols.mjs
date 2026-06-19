
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sxebygxpjzntogzpjnga.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFollowUps() {
  console.log("Checking follow_ups table assigned_to column...");
  const { data, error } = await supabase.from('follow_ups').select('assigned_to').limit(1);
  if (error) {
    console.error("Error fetching assigned_to:", error);
  } else {
    console.log("Success! Data:", data);
  }
}

checkFollowUps();
