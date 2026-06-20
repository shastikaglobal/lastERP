import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSavedSignatures() {
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email_signature')
    .not('email_signature', 'is', null);
    
  if (fetchError) {
    console.error("Fetch error:", fetchError);
    return;
  }
  
  console.log(`Found ${profiles.length} profiles with custom signatures.`);
  
  let updateCount = 0;
  for (const prof of profiles) {
    if (prof.email_signature.includes('shastikaglobal.co.in/static/images/ag_logo.png')) {
      const updatedSig = prof.email_signature.replace(
        /https:\/\/shastikaglobal\.co\.in\/static\/images\/ag_logo\.png/g,
        'https://sxebygxpjzntogzpjnga.supabase.co/storage/v1/object/public/chat-attachments/company-logo-1779776670741.png'
      );
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ email_signature: updatedSig })
        .eq('id', prof.id);
        
      if (updateError) {
        console.error(`Failed to update profile ${prof.id}:`, updateError);
      } else {
        updateCount++;
        console.log(`Successfully updated logo in profile signature for ${prof.id}`);
      }
    }
  }
  
  console.log(`Finished. Updated ${updateCount} signatures.`);
}

updateSavedSignatures();
