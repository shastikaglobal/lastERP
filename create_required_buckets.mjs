import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBuckets() {
  console.log("Supabase URL:", supabaseUrl);
  
  // 1. Create chat-attachments bucket
  console.log("Checking / creating 'chat-attachments' bucket...");
  const { data: b1, error: e1 } = await supabase.storage.createBucket('chat-attachments', {
    public: true,
    fileSizeLimit: 20971520, // 20MB
  });
  if (e1) {
    console.log("'chat-attachments' bucket creation message:", e1.message);
  } else {
    console.log("'chat-attachments' bucket created successfully:", b1);
  }

  // 2. Create email-attachments bucket
  console.log("Checking / creating 'email-attachments' bucket...");
  const { data: b2, error: e2 } = await supabase.storage.createBucket('email-attachments', {
    public: true,
    fileSizeLimit: 20971520, // 20MB
  });
  if (e2) {
    console.log("'email-attachments' bucket creation message:", e2.message);
  } else {
    console.log("'email-attachments' bucket created successfully:", b2);
  }

  // 3. Upload logo.png to chat-attachments
  console.log("Uploading logo.png as company-logo-1779776670741.png...");
  const fileBuffer = fs.readFileSync('logo.png');
  const fileName = 'company-logo-1779776670741.png';
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('chat-attachments')
    .upload(fileName, fileBuffer, {
      contentType: 'image/png',
      cacheControl: '31536000', // 1 year cache
      upsert: true
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
  } else {
    console.log("Logo uploaded successfully!", uploadData);
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);
    console.log("Public URL:", urlData.publicUrl);
  }
}

setupBuckets().catch(console.error);
