import dns from 'dns';
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^["']|["']$/g, '')]; })
);

const resendApiKey = env.RESEND_API_KEY;
console.log('Testing Resend API Key:', resendApiKey);

async function testResend() {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: 'shastikaglobal11@gmail.com',
      subject: 'Resend API Key Test',
      html: '<p>Testing direct Resend API key validation.</p>'
    })
  });

  const status = resp.status;
  const text = await resp.text();
  console.log('Response Status:', status);
  console.log('Response Text:', text);
}

testResend().catch(console.error);
