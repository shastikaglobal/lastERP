import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].replace(/['"]/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserFlow() {
  console.log("Signing in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'karunyajothiprakash811@gmail.com',
    password: 'Welcome@Shastika2026'
  });
  
  if (authError) {
    console.error("Sign in failed:", authError);
    return;
  }
  
  console.log("Sign in success. User ID:", authData.user.id);
  
  // Set auth header in supabase client
  supabase.auth.setSession(authData.session);
  
  console.log("Fetching emails...");
  const { data: emails, error: fetchError } = await supabase
    .from('emails')
    .select('*')
    .limit(1);
    
  if (fetchError) {
    console.error("Fetch emails failed:", fetchError);
    return;
  }
  
  if (!emails || emails.length === 0) {
    console.log("No emails found to test update.");
    return;
  }
  
  const email = emails[0];
  console.log(`Found email ID: ${email.id}, Subject: "${email.subject}", IsRead: ${email.is_read}`);
  
  console.log("Attempting to update is_read to true...");
  const { data: updateData, error: updateError } = await supabase
    .from('emails')
    .update({ is_read: true })
    .eq('id', email.id)
    .select();
    
  if (updateError) {
    console.error("❌ Update email failed:", updateError);
  } else {
    console.log("✅ Update email success! Result:", updateData);
  }
}

testUserFlow();
