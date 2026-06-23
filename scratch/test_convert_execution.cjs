const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const env = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].replace(/['"]/g, '').trim();
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].replace(/['"]/g, '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConvert() {
  console.log("Signing in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'karunyajothiprakash811@gmail.com',
    password: 'Welcome@Shastika2026'
  });

  if (authError) {
    console.error("Sign in failed:", authError);
    return;
  }

  const token = authData.session.access_token;
  const farmerId = 'b57f668b-f86f-41a5-8945-884f09c1ebc4'; // pavish
  const companyId = '00000000-0000-0000-0000-00000000ae01';

  console.log(`Sending POST request to convert farmer ${farmerId}...`);
  try {
    const res = await fetch(`https://shastikaglobalexport.co.in/api/farmers/${farmerId}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ company_id: companyId })
    });

    const status = res.status;
    const body = await res.text();
    console.log(`Response Status: ${status}`);
    console.log(`Response Body: ${body}`);
  } catch (err) {
    console.error("Fetch request failed:", err.message);
  }
}

testConvert();
