import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sxebygxpjzntogzpjnga.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmF0ZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteDummyData() {
  const tables = ['export_orders', 'export_shipments', 'export_containers'];
  for (const tbl of tables) {
    const { error, count } = await supabase
      .from(tbl)
      .delete()
      .neq('id', ''); // delete all rows
    if (error) {
      console.error(`Error deleting from ${tbl}:`, error);
    } else {
      console.log(`Deleted rows from ${tbl}`);
    }
  }
  // Refresh schema cache
  await supabase.rpc('pg_notify', { channel: 'pgrst', payload: 'reload schema' }).catch(()=>{});
}

deleteDummyData();
