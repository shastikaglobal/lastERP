import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedQuotation() {
  const { data: companies } = await supabase.from('companies').select('id').limit(1);
  const { data: customers } = await supabase.from('customers').select('id').limit(1);
  
  if (!companies?.length || !customers?.length) return;

  const { data, error } = await supabase.from('quotations').insert({
    company_id: companies[0].id,
    customer_id: customers[0].id,
    quotation_number: `QT-2026-${Math.floor(Math.random() * 1000)}`,
    amount: 1500, // I'll try this again, maybe the cache reloaded?
    currency: 'USD',
    status: 'Approved',
    items_count: 5
  }).select();

  if (error) {
    console.error("Insert failed:", error.message);
    if (error.message.includes('amount')) {
      console.log("Retrying without 'amount'...");
      const { data: data2, error: error2 } = await supabase.from('quotations').insert({
        company_id: companies[0].id,
        customer_id: customers[0].id,
        quotation_number: `QT-2026-${Math.floor(Math.random() * 1000)}`,
        status: 'Draft'
      }).select();
      console.log("Retry result:", data2 || error2);
    }
  } else {
    console.log("Seed success:", data);
  }
}

seedQuotation();
