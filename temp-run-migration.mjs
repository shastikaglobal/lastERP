import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf8');
const env = Object.fromEntries(envFile.split(/\r?\n/).filter(Boolean).map(line => {
  const idx = line.indexOf('=');
  if (idx === -1) return [line, ''];
  const key = line.slice(0, idx);
  let value = line.slice(idx + 1);
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  return [key, value];
}));

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

console.log('Invoking run-migration function on Supabase...');

const response = await supabase.functions.invoke('run-migration', {
  body: JSON.stringify({})
});

console.log('response status:', response.status);
console.log('response data:', response.data);
console.log('response error:', response.error);
