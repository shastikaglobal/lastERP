const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const newCustomer = {
    id: 'd399735f-4a41-4efb-bfbf-afcad6846ac6',
    company_id: '00000000-0000-0000-0000-00000000ae01',
    name: 'Jothiprakash',
    email: 'karunyajothiprakash811@gmail.com',
    country: 'India',
    phone: '8122207579',
    notes: 'farmer',
    farmer_id: '5aafa79f-9292-4b12-aff0-12a9c66484bf'
  };

  try {
    console.log("Inserting customer into Supabase...");
    const { data, error } = await supabase
      .from('customers')
      .insert([newCustomer])
      .select();

    if (error) {
      console.error("Supabase insert error:", error);
    } else {
      console.log("Supabase insert success:", data);
    }
  } catch (err) {
    console.error("Supabase insert threw exception:", err);
  }
  process.exit(0);
}

test();
