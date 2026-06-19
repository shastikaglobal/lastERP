import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findEmailsWithImageDisplay() {
  const { data: emails, error } = await supabase
    .from('emails')
    .select('id, zoho_message_id, from_address, subject, folder, account_id, received_at')
    .not('body_html', 'is', null)
    .limit(200);
  
  if (error) { console.error(error); return; }

  const broken = emails.filter(e => {
    // We need the full body_html to check, but we only selected summary fields
    return true; 
  });

  console.log(`Found ${emails.length} emails with body_html.`);
  
  // Now look for any that might have ImageDisplay - need body_html
  const { data: brokenEmails } = await supabase
    .from('emails')
    .select('id, zoho_message_id, from_address, subject, folder, account_id')
    .like('body_html', '%ImageDisplay%');
  
  console.log(`\nEmails with broken ImageDisplay URLs: ${brokenEmails?.length || 0}`);
  for (const email of (brokenEmails || [])) {
    console.log(`  - ${email.id} | ${email.from_address} | "${email.subject}" | folder: ${email.folder} | account: ${email.account_id} | msg_id: ${email.zoho_message_id}`);
  }
}

findEmailsWithImageDisplay();
