import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].replace(/['"]/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentBounces() {
  const { data, error } = await supabase
    .from('emails')
    .select('id, subject, from_address, received_at')
    .ilike('subject', '%undelivered%')
    .order('received_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error(error);
  } else {
    console.log("Recent bounce emails in DB:", JSON.stringify(data, null, 2));
  }
}

checkRecentBounces();
