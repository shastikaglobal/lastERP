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
  .select('id, subject, created_at, attachments')
  .order('created_at', {ascending: false})
  .limit(5)
  .then(r => console.log(r.error ? r.error : JSON.stringify(r.data, null, 2)))
  .catch(console.error);
