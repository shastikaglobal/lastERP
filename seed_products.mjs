import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const productsData = [
  { sku: "AGRI-CCN-TND", name: "Tender Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-GRN", name: "Green Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-HSK", name: "Husked Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-SHK", name: "Semi-Husked Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-DHK", name: "Dehusked Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-CCN-ORG", name: "Fresh Organic Coconut", category: "Coconuts", unit: "Piece", is_active: true },
  { sku: "AGRI-TOM-001", name: "Tomato", category: "Vegetables", unit: "Ton", is_active: true },
  { sku: "AGRI-WML-REG", name: "Watermelon", category: "Fruits", unit: "Ton", is_active: true },
  { sku: "AGRI-WML-BLK", name: "Black Diamond Watermelon", category: "Fruits", unit: "Ton", is_active: true },
  { sku: "AGRI-PMK-YEL", name: "Yellow Pumpkin", category: "Vegetables", unit: "Ton", is_active: true },
  { sku: "AGRI-PMK-WHT", name: "White Pumpkin", category: "Vegetables", unit: "Ton", is_active: true },
  { sku: "AGRI-CUC-YEL", name: "Yellow Cucumber", category: "Vegetables", unit: "Ton", is_active: true },
  { sku: "AGRI-BAN-CAV", name: "Cavendish Banana", category: "Bananas", unit: "Ton", is_active: true },
  { sku: "AGRI-BAN-BBY", name: "Baby Banana", category: "Bananas", unit: "Ton", is_active: true },
  { sku: "AGRI-BAN-NEN", name: "Nendran Banana", category: "Bananas", unit: "Ton", is_active: true },
  { sku: "AGRI-BAN-RED", name: "Red Banana", category: "Bananas", unit: "Ton", is_active: true },
];

async function seed() {
  console.log("Fetching a company...");
  const { data: companies, error: cErr } = await supabase.from('companies').select('id').limit(1);
  if (cErr || !companies.length) {
    console.error("No company found", cErr);
    return;
  }
  const companyId = companies[0].id;

  console.log("Upserting exact products...");
  const records = productsData.map(p => ({ ...p, company_id: companyId }));
  
  // We upsert based on company_id + sku so we update names if they changed
  for (const record of records) {
    await supabase.from('products').upsert(record, { onConflict: 'company_id, sku' });
  }
  
  console.log(`Successfully upserted ${records.length} products to match the website exactly!`);
}

seed();
