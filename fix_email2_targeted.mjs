import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const env = dotenv.parse(fs.readFileSync('.env'));
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const emailId = 'c56a6e87-1c9a-49de-bf07-dd003df2cac0';
const messageId = '1781778639669108900';
const accountId = 'c1711e04-903b-4243-9203-5cd125d391cb';
const attachmentId = '140010714396970020';
const cid = '0.1822410860.6974196630475898599.19eda485f13__inline__img__src';

async function run() {
  const { data: account } = await supabase.from('zoho_accounts').select('*').eq('id', accountId).single();
  const apiDomain = account.account_email?.endsWith('.com') ? 'zoho.com' : 'zoho.in';

  const clientId = env.VITE_ZOHO_CLIENT_ID;
  const clientSecret = env.ZOHO_CLIENT_SECRET;
  const refreshResponse = await fetch(`https://accounts.${apiDomain}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: account.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  const refreshData = await refreshResponse.json();
  const accessToken = refreshData.access_token || account.access_token;
  console.log('Token:', refreshData.access_token ? 'refreshed' : 'using existing');

  const verifiedZohoId = '5007295000000002002';
  const folderId = '5007295000000002014'; // Inbox

  // Get current email body
  const { data: emailData } = await supabase.from('emails').select('body_html').eq('id', emailId).single();
  let htmlContent = emailData?.body_html || '';
  
  console.log('HTML has ImageDisplay:', htmlContent.includes('ImageDisplay'));
  // Show all ImageDisplay occurrences
  const matches = htmlContent.match(/ImageDisplay\?[^'"]+/g);
  console.log('ImageDisplay occurrences:', matches);

  // Download the inline image
  const downloadUrl = `https://mail.${apiDomain}/api/accounts/${verifiedZohoId}/folders/${folderId}/messages/${messageId}/attachments/${attachmentId}`;
  console.log('Downloading from:', downloadUrl);
  const downloadResponse = await fetch(downloadUrl, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}`, Accept: 'application/octet-stream' },
  });
  
  console.log('Download status:', downloadResponse.status);
  if (!downloadResponse.ok) {
    const errText = await downloadResponse.text();
    console.error('Download error:', errText);
    return;
  }
  
  const arrayBuffer = await downloadResponse.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  console.log('Downloaded bytes:', fileBuffer.length);
  
  const base64Str = fileBuffer.toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64Str}`;
  
  console.log('Data URI length:', dataUri.length);
  
  // Try all replacement strategies
  const cleanCid = cid.replace(/[<>]/g, '').trim();
  
  // Strategy 1: Replace src attributes with this CID
  const srcAttrRegex = new RegExp(`src=(['"])([^'"]*(?:cid:?<?${cleanCid.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}|${cleanCid.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})[^'"]*)\\1`, "gi");
  const htmlBefore1 = htmlContent;
  htmlContent = htmlContent.replace(srcAttrRegex, `src=$1${dataUri}$1`);
  console.log('After strategy 1 (cid src attr):', htmlContent !== htmlBefore1 ? 'changed' : 'no change');
  
  // Strategy 2: Raw cid replacements
  const rawRegex = new RegExp(`cid:?<?${cleanCid.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}[^"'\\s>]*>?`, "gi");
  const htmlBefore2 = htmlContent;
  htmlContent = htmlContent.replace(rawRegex, dataUri);
  console.log('After strategy 2 (raw cid):', htmlContent !== htmlBefore2 ? 'changed' : 'no change');
  
  // Strategy 3: Generic ImageDisplay replacement
  const htmlBefore3 = htmlContent;
  htmlContent = htmlContent.replace(/src=(['"])\/?mail\/ImageDisplay\?[^'"]*\1/gi, `src=$1${dataUri}$1`);
  console.log('After strategy 3 (generic ImageDisplay):', htmlContent !== htmlBefore3 ? 'changed' : 'no change');
  
  console.log('\nFinal state:');
  console.log('Has ImageDisplay:', htmlContent.includes('ImageDisplay'));
  console.log('Has data:image:', htmlContent.includes('data:image'));
  
  if (!htmlContent.includes('ImageDisplay')) {
    console.log('\n✅ All ImageDisplay references resolved! Updating DB...');
    const { error } = await supabase.from('emails').update({ body_html: htmlContent }).eq('id', emailId);
    if (error) { console.error('DB error:', error); return; }
    console.log('✅ DB updated successfully!');
  } else {
    console.log('\n❌ Still has ImageDisplay! Showing relevant HTML around first occurrence:');
    const idx = htmlContent.indexOf('ImageDisplay');
    console.log(htmlContent.substring(Math.max(0, idx - 100), idx + 200));
  }
}

run().catch(console.error);
