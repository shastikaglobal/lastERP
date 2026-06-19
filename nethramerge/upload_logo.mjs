import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadLogo() {
  const fileBuffer = fs.readFileSync('logo.png');
  const fileName = `company-logo-${Date.now()}.png`;
  
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(fileName, fileBuffer, {
      contentType: 'image/png',
      cacheControl: '31536000', // 1 year cache
      upsert: true
    });
    
  if (error) {
    console.error("Upload error:", error);
  } else {
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);
      
    console.log("Success! Public URL:", urlData.publicUrl);
  }
}

uploadLogo();
