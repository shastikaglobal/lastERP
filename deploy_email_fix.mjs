import fs from 'fs';
import path from 'path';

// Project Configuration
const PROJECT_REF = "sxebygxpjzntogzpjnga";
// We use the service role key if available, otherwise we ask the user
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI"; // PASTE YOUR SERVICE ROLE KEY HERE IF YOU HAVE IT

async function deploy() {
  const functionPath = path.join(process.cwd(), 'supabase', 'functions', 'send-email', 'index.ts');
  const code = fs.readFileSync(functionPath, 'utf8');

  console.log("🚀 Attempting direct deployment to Supabase...");

  if (!SERVICE_ROLE_KEY) {
    console.error("❌ Error: SERVICE_ROLE_KEY is missing.");
    console.log("Please go to Settings > API in your Supabase dashboard, copy the 'service_role' key, and paste it into this script.");
    return;
  }

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'send-email',
        slug: 'send-email',
        body: code,
        verify_jwt: false
      })
    });

    if (response.ok) {
      console.log("✅ SUCCESS! Your email function has been deployed.");
    } else {
      const error = await response.json();
      console.error("❌ Deployment failed:", error.message);
    }
  } catch (err) {
    console.error("❌ Network error:", err.message);
  }
}

deploy();
