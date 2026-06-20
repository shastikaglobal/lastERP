import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sxebygxpjzntogzpjnga.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4ZWJ5Z3hwanpudG9nenBqbmdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjc5MzksImV4cCI6MjA5MjkwMzkzOX0.rtClmtuPuNicVQvBkITzY6PfFsh8yOYq3ykWoL9Ab_4";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const vehicles = [
    { license_plate: 'TN 01 AB 1234', type: 'Lorry' },
    { license_plate: 'TN 02 CD 5678', type: 'Mini Truck' },
    { license_plate: 'TN 03 EF 9012', type: 'Container' },
    { license_plate: 'TN 04 GH 3456', type: 'Tempo' },
  ];
  for (const v of vehicles) {
    const { error } = await supabase.from('vehicles').insert([v]);
    if (error) console.log("error inserting vehicle", error.message);
    else console.log("inserted vehicle", v.license_plate);
  }

  const drivers = [
    { full_name: 'Ravi Kumar', license_number: 'TN1234567' },
    { full_name: 'Murugan S', license_number: 'TN2345678' },
    { full_name: 'Selvam K', license_number: 'TN3456789' },
    { full_name: 'Prakash R', license_number: 'TN4567890' },
  ];
  for (const d of drivers) {
    const { error } = await supabase.from('drivers').insert([d]);
    if (error) console.log("error inserting driver", error.message);
    else console.log("inserted driver", d.full_name);
  }
}
run();
