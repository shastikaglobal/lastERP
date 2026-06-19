import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(line => {
  const [k, ...v] = line.split('=');
  return [k.trim(), v.join('=').trim().replace(/"/g, '').replace(/\r$/, '')];
}));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkCols() {
  const { data, error } = await supabase.from('products').select('*').limit(1);
  if (error) {
    fs.writeFileSync('cols.json', JSON.stringify({ error }));
    return;
  }
  fs.writeFileSync('cols.json', JSON.stringify(data.length > 0 ? Object.keys(data[0]) : [], null, 2));
}
checkCols();
