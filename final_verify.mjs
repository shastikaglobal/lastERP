import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
  console.log("Starting verification...");
  
  // 1. Get a valid company_id and customer_id
  const { data: companies } = await supabase.from('companies').select('id').limit(1);
  const { data: customers } = await supabase.from('customers').select('id').limit(1);
  const { data: products } = await supabase.from('products').select('id').limit(1);

  const company_id = companies?.[0]?.id || "00000000-0000-0000-0000-00000000ae01";
  const customer_id = customers?.[0]?.id || null;
  const product_id = products?.[0]?.id || null;

  console.log(`Using Company ID: ${company_id}`);
  console.log(`Using Customer ID: ${customer_id}`);

  // 2. Insert Quotation
  const qNumber = `QT-VERIFY-${Date.now()}`;
  const { data: qData, error: qError } = await supabase
    .from("quotations")
    .insert({
      company_id,
      customer_id,
      quotation_number: qNumber,
      total_amount: 5000,
      currency: "USD",
      status: "Draft"
    })
    .select()
    .single();

  if (qError) {
    console.error("❌ Quotation insert failed:", qError.message);
    return;
  }
  console.log("✅ Quotation inserted successfully:", qData.id);

  // 3. Insert Line Item
  if (product_id) {
    const { error: liError } = await supabase.from("quotation_items").insert({
      quotation_id: qData.id,
      product_id: product_id,
      quantity: 10,
      unit_price: 500
    });

    if (liError) {
      console.warn("⚠️ Line-item insert failed:", liError.message);
    } else {
      console.log("✅ Line-item inserted successfully");
    }
  } else {
    console.warn("⚠️ No product found to create line-item");
  }

  // 4. Fetch back with join
  const { data: fetched, error: fError } = await supabase
    .from("quotations")
    .select(`
      *,
      quotation_items (*)
    `)
    .eq("id", qData.id)
    .single();

  if (fError) {
    console.error("❌ Fetch verification failed:", fError.message);
  } else {
    console.log("🚀 FINAL VERIFICATION SUCCESSFUL!");
    console.log("Quotation Number:", fetched.quotation_number);
    console.log("Total Amount:", fetched.total_amount);
    console.log("Items Count:", fetched.quotation_items?.length || 0);
  }
}

verify();
