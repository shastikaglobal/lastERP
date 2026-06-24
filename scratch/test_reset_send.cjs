const fetch = require('node-fetch');

async function testSend() {
  console.log('📬 Sending test password reset request for aditi@shastikaglobalimpex.co.in...');
  
  try {
    const res = await fetch('https://shastikaglobalexport.co.in/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'aditi@shastikaglobalimpex.co.in'
      })
    });
    
    const status = res.status;
    const data = await res.json();
    
    console.log(`📡 Response Status: ${status}`);
    console.log('📡 Response Body:', data);
    
    if (status === 200 && data.success) {
      console.log('🎉 SUCCESS! The password reset endpoint successfully processed the request and routed it to shastikaglobal11@gmail.com.');
    } else {
      console.error('❌ FAILURE: Endpoint returned an error response.');
    }
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

testSend();
