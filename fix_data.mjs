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
  // 1. Update the inventory batch to use Husked Brown Coconut instead
  const { error: updateError } = await supabase
    .from('inventory_batches')
    .update({ product_id: 'd46bf963-5984-48cc-a726-8bb9b56c00a8', lot_number: 'LOT-21656-PREMIUM' })
    .eq('id', 'ccc5899b-3eda-4075-a5cd-3a4b820e7c2d');
    
  console.log('Update Batch Error:', updateError);

  // 2. Delete the dummy product
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('id', '1fb54241-fc0e-43a3-8845-b05f7499818e');
    
  console.log('Delete Product Error:', deleteError);
}
main();
