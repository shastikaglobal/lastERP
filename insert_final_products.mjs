import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf-8');
const env = Object.fromEntries(envFile.split('\n').filter(l => l.includes('=')).map(line => {
  const [k, ...v] = line.split('=');
  return [k.trim(), v.join('=').trim().replace(/"/g, '').replace(/\r$/, '')];
}));

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const defaultProducts = [
  { name: 'Tender Coconut', category: 'Coconut', is_active: true },
  { name: 'Green Coconut', category: 'Coconut', is_active: true },
  { name: 'Husked Coconut', category: 'Coconut', is_active: true },
  { name: 'Semi-Husked Coconut', category: 'Coconut', is_active: true },
  { name: 'Dehusked Coconut', category: 'Coconut', is_active: true },
  { name: 'Fresh Organic Coconut', category: 'Coconut', is_active: true },
  { name: 'Tomato', category: 'Vegetables', is_active: true },
  { name: 'Watermelon', category: 'Fruits', is_active: true },
  { name: 'Black Diamond Watermelon', category: 'Fruits', is_active: true },
  { name: 'Yellow Pumpkin', category: 'Vegetables', is_active: true },
  { name: 'White Pumpkin', category: 'Vegetables', is_active: true },
  { name: 'Yellow Cucumber', category: 'Vegetables', is_active: true },
  { name: 'Cavendish Banana', category: 'Banana', is_active: true },
  { name: 'Baby Banana', category: 'Banana', is_active: true },
  { name: 'Nendran Banana', category: 'Banana', is_active: true },
  { name: 'Red Banana', category: 'Banana', is_active: true }
];

async function run() {
  const { data: companies } = await supabase.from('companies').select('id').limit(1);
  if (!companies || !companies.length) {
    console.error("No company found!");
    return;
  }
  const companyId = companies[0].id;
  console.log("Using company ID:", companyId);

  const productsData = defaultProducts.map((p, i) => ({
    ...p,
    company_id: companyId,
    sku: `SKU-${Date.now()}-${i}` 
  }));

  const { data, error } = await supabase.from('products').insert(productsData).select('*');
  if (error) {
     console.error("INSERT ERROR", error);
     fs.writeFileSync('insert_error2.json', JSON.stringify(error, null, 2));
  } else {
     console.log("INSERT SUCCESS", data.length, "rows inserted.");
  }
}
run();
