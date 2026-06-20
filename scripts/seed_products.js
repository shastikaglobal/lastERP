import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key missing in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const productsToInsert = [
  "Tender Coconut",
  "Green Coconut",
  "Husked Coconut",
  "Semi-Husked Coconut",
  "Dehusked Coconut",
  "Fresh Organic Coconut",
  "Tomato",
  "Watermelon",
  "Black Diamond Watermelon",
  "Yellow Pumpkin",
  "White Pumpkin",
  "Yellow Cucumber",
  "Cavendish Banana",
  "Baby Banana",
  "Nendran Banana",
  "Red Banana"
];

async function seedProducts() {
  console.log("Starting product seed script...");

  // Fetch the first available company ID to assign products to
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id')
    .limit(1);

  if (compErr || !companies || companies.length === 0) {
    console.error("Could not find a company to attach products to.");
    process.exit(1);
  }
  
  const companyId = companies[0].id;
  console.log("Using company_id:", companyId);

  const formattedProducts = productsToInsert.map(name => {
    const sku = "AGRI-" + name.replace(/\s+/g, '-').toUpperCase();
    
    return {
      name: name,
      sku: sku,
      company_id: companyId,
      is_active: true,
      category: "Fruit/Vegetable",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  const { data, error } = await supabase
    .from('products')
    .insert(formattedProducts) 
    .select();

  if (error) {
    import('fs').then(fs => {
        fs.writeFileSync('error.json', JSON.stringify(error, null, 2));
        console.error("Error seeding products... wrote to error.json");
        process.exit(1);
    });
    return;
  }

  console.log(`Successfully seeded ${data.length} products!`);
}

seedProducts();
