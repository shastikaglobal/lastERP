const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testFetch() {
  console.log('🔑 Logging in to Supabase Auth...');
  
  try {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: 'karunyaajothiprakash@gmail.com',
      password: 'Karunya@123'
    });
    
    if (authErr) {
      console.error('❌ Login failed:', authErr.message);
      return;
    }
    
    const accessToken = authData.session.access_token;
    console.log('✅ Logged in successfully. Access token retrieved.');
    
    // Get company_id of the logged in user from their profile
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', authData.user.id)
      .single();
      
    if (profErr) {
      console.error('❌ Failed to fetch user profile:', profErr.message);
      return;
    }
    
    const companyId = profile.company_id;
    console.log(`👤 Logged in User Company ID: ${companyId}`);
    
    console.log('\n📡 Querying GET /api/farmers from VPS Backend...');
    const url = `https://erp.shastikaglobalexport.co.in/api/farmers`;
    console.log(`URL: ${url}`);
    
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const status = res.status;
    const body = await res.json();
    
    console.log(`📡 Response Status: ${status}`);
    console.log('📡 Response Body:', body);
    
  } catch (err) {
    console.error('❌ Request failed:', err.message);
  }
}

testFetch();
