import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
  // 1️⃣ Insert a test quotation (using the correct column names)
  const quotationPayload = {
    company_id: "7b00167a-4ca3-41ba-9660-600c0edf90ac", // replace with a valid company from your DB if needed
    customer_id: null,
    quotation_number: `QT-TEST-${Date.now()}`,
    total_amount: 1234.56,
    currency: "USD",
    status: "Draft",
    valid_until: null
  };

  const { data: qData, error: qError } = await supabase
    .from("quotations")
    .insert(quotationPayload)
    .select()
    .single();

  if (qError) {
    console.error("❌ Quotation insert failed:", qError.message);
    return;
  }
  console.log("✅ Quotation inserted:", qData);

  // 2️⃣ Try to insert a line‑item (if the table exists)
  const lineItem = {
    quotation_id: qData.id,
    product_id: null,
    quantity: 2,
    unit_price: 100,
    total_price: 200
  };

  const { error: liError } = await supabase.from("quotation_items").insert(lineItem);
  if (liError) {
    console.warn("⚠️ Could not insert line‑item (table may be missing):", liError.message);
  } else {
    console.log("✅ Line‑item inserted");
  }

  // 3️⃣ Fetch back the quotation
  const { data: fetched, error: fError } = await supabase
    .from("quotations")
    .select("*, quotation_items(*)")
    .eq("id", qData.id)
    .single();

  if (fError) {
    console.error("❌ Fetch failed:", fError.message);
  } else {
    console.log("🔎 Fetched quotation with relations:", JSON.stringify(fetched, null, 2));
  }
}

verify();
