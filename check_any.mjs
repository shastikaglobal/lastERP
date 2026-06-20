import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].replace(/['"]/g, '').trim();

// Let's read from the env check_accounts had error because of missing service role key in local env. Wait, we saw .env earlier, it has:
// VITE_SUPABASE_ANON_KEY but no service role key.
// But wait! We can bypass RLS if we query directly? No, the client needs the service role key for that.
// Let's check if the anon key can query if we don't have RLS, but it returned [].
// Wait, is there a bounce in the database? Let's check if there are ANY emails in the database at all using the anon key.

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnyEmails() {
  const { data, error } = await supabase.from('emails').select('id, subject, from_address, folder, received_at').limit(5);
  console.log("Emails found:", data, error);
}
checkAnyEmails();
