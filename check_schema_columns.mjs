import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkEmails() {
  console.log("Querying emails with attachments...");
  const { data, error } = await supabase
    .from('emails')
    .select('id, subject, attachments')
    .not('attachments', 'is', null)
    .limit(15);
    
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  for (const email of data) {
    console.log(`Email ID: ${email.id} | Subject: "${email.subject}"`);
    console.log("Attachments:", JSON.stringify(email.attachments, null, 2));
    console.log("-----------------------------------------");
  }
}

checkEmails();
