const {createClient} = require('@supabase/supabase-js');
const fs = require('fs');
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(l => {
  const [k, v] = l.split('=');
  if (k && v) {
    env[k.trim()] = v.trim().replace(/['"]/g, '');
  }
});
const s = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
s.from('emails')
  .select('id, subject, attachments, body_html')
  .like('body_html', '%cid:%')
  .limit(3)
  .then(r => {
    if (r.error) console.error(r.error);
    else {
      r.data.forEach(row => {
        console.log("Email:", row.subject);
        console.log("Attachments:", row.attachments);
        console.log("Has cid in body?", row.body_html?.includes('cid:'));
      });
    }
  });
