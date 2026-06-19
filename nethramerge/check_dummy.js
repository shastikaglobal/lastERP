import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sxebygxpjzntogzpjnga.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase
    .from('export_orders')
    .select('*');
    
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  console.log('Total orders:', data.length);
  if (data.length > 0) {
    console.log('Sample data:', data[0]);
  }
}

checkData();
