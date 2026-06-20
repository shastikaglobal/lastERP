import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: emails, error } = await supabase
    .from('emails')
    .select('*')
    .eq('id', '20ea04d4-1f39-4896-abca-d07fe1b04df8');
  
  if (emails && emails[0]) {
    console.log("zoho_message_id:", emails[0].zoho_message_id);
    console.log("body_html contains ImageDisplay:", emails[0].body_html?.includes("ImageDisplay"));
    console.log("body_html snippet:", emails[0].body_html?.substring(0, 1000));
  }

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${emails.length} emails with subject 'hi mam':`);
  for (const email of emails) {
    console.log("ID:", email.id);
    console.log("From:", email.from_address);
    console.log("Has html:", !!email.body_html);
    if (email.body_html) {
      console.log("HTML length:", email.body_html.length);
      console.log("HTML contains company logo URL:", email.body_html.includes("company-logo-1779776670741.png"));
      console.log("HTML contains cid:company_logo.png:", email.body_html.includes("cid:company-logo-1779776670741.png") || email.body_html.includes("cid:company_logo.png"));
      // Log occurrences of 'cid:'
      const cids = email.body_html.match(/cid:[^\s"'>]+/g);
      console.log("CIDs in HTML:", cids);
      console.log("Body snippet:", email.body_html.substring(0, 1500));
    }
    console.log("Attachments:", JSON.stringify(email.attachments, null, 2));
    console.log("-----------------------------------------");
  }
}

inspect();
