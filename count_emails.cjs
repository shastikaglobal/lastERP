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
  .select('*', { count: 'exact', head: true })
  .then(r => console.log(r.error ? r.error : r.count))
  .catch(console.error);
