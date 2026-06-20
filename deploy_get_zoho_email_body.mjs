import fs from 'fs';
import path from 'path';

// Project Configuration
const PROJECT_REF = "sxebygxpjzntogzpjnga";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzMyNzkzOSwiZXhwIjoyMDkyOTAzOTM5fQ.ke2FGR_2LlFLXziLRewOH3isT6xZGQ29AQQu-u5l9eI";

async function deploy() {
  const functionPath = path.join(process.cwd(), 'supabase', 'functions', 'get-zoho-email-body', 'index.ts');
  const code = fs.readFileSync(functionPath, 'utf8');

  console.log("🚀 Attempting direct deployment of get-zoho-email-body to Supabase...");

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/get-zoho-email-body`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'get-zoho-email-body',
        slug: 'get-zoho-email-body',
        body: code,
        verify_jwt: false
      })
    });

    if (response.ok) {
      console.log("✅ SUCCESS! Your get-zoho-email-body function has been deployed.");
    } else {
      const error = await response.json();
      console.error("❌ Deployment failed:", error.message || JSON.stringify(error));
    }
  } catch (err) {
    console.error("❌ Network error:", err.message);
  }
}

deploy();
