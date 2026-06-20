import { supabase } from "./src/integrations/supabase/client";

async function checkSchema() {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error("Error fetching quotations:", error);
  } else {
    console.log("Quotations table columns:", Object.keys(data[0] || {}));
  }
}

// Since I can't run this directly, I'll try to find a way to see the schema.
