import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkItemColumns() {
  const testColumns = ['id', 'quotation_id', 'product_id', 'quantity', 'unit_price', 'total_price', 'price_unit', 'price_total'];
  
  for (const col of testColumns) {
    const { error } = await supabase.from('quotation_items').select(col).limit(1);
    if (error) {
      console.log(`Column ${col}: MISSING (${error.message})`);
    } else {
      console.log(`Column ${col}: EXISTS`);
    }
  }
}

checkItemColumns();
