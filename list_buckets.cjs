const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=\"?([^\"]+)\"?/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=\"?([^\"]+)\"?/);

const supabaseUrl = urlMatch[1];
const supabaseKey = keyMatch[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log(data?.map(b => b.name), error);
}

check();
