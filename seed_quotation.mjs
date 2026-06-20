import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedQuotation() {
  const { data: companies } = await supabase.from('companies').select('id').limit(1);
  const { data: customers } = await supabase.from('customers').select('id').limit(1);
  
  if (!companies?.length || !customers?.length) {
    console.error("Missing company or customer to link quotation");
    return;
  }

  const companyId = companies[0].id;
  const customerId = customers[0].id;

  const { data, error } = await supabase.from('quotations').insert({
    company_id: companyId,
    customer_id: customerId,
    quotation_number: `QT-2026-${Math.floor(Math.random() * 1000)}`,
    amount: 45000,
    currency: 'USD',
    status: 'Approved',
    items_count: 12,
    valid_until: '2026-12-31'
  }).select();

  if (error) {
    console.error("Error seeding quotation:", error);
  } else {
    console.log("Seeded quotation:", data);
  }
}

seedQuotation();
