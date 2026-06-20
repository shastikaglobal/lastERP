import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = envFile.split('\n').reduce((acc, line) => {
  const [k, ...v] = line.split('=');
  if(k) acc[k.trim()] = v.join('=').trim().replace(/"/g, '');
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const { data: p, error: pError } = await supabase.from('products').select('*');
  console.log('Test products:', p);
  console.log('Error p:', pError);
  
  const { data: b, error: bError } = await supabase.from('inventory_batches').select('*, product:products(name)');
  console.log('Batches:', JSON.stringify(b, null, 2));
  console.log('Error b:', bError);
}
main();
