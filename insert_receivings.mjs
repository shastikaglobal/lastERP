import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8').split('\n').filter(l => l.includes('=')).reduce((a,c) => { 
  const [k,...v] = c.split('='); 
  a[k.trim()] = v.join('=').trim().replace(/\"/g, '').replace(/\r$/, ''); 
  return a; 
}, {}); 

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching active products...');
  // Get active products
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, name')
    .eq('is_active', true)
    .limit(16);

  if (pErr || !products || products.length === 0) {
    console.error('Failed to get products', pErr);
    return;
  }

  // Get a valid company id and warehouse id if possible
  const { data: company } = await supabase.from('companies').select('id').limit(1).single();
  const company_id = company?.id;

  const { data: warehouse } = await supabase.from('warehouses').select('id').limit(1).single();
  const warehouse_id = warehouse?.id;

  if (!company_id) {
      console.log("No company found, required for inventory_batches.");
      return;
  }

  const entries = products.map((p, i) => {
    return {
      company_id,
      lot_number: `GRN-${String(i + 1).padStart(3, '0')}`,
      product_id: p.id,
      warehouse_id: warehouse_id || null,
      quantity_kg: 500,
      quantity_remaining_kg: 500,
      status: 'qc_passed',
      is_export_ready: true,
      received_date: new Date().toISOString().split('T')[0],
      notes: 'Sample receiving record'
    };
  });

  console.log(`Inserting ${entries.length} items into inventory_batches...`);
  
  const { data, error } = await supabase.from('inventory_batches').insert(entries);
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Successfully inserted mock receivings into inventory_batches.');
  }
}

run();
