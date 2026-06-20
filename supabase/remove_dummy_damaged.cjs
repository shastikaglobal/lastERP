const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env for keys
const envContent = fs.readFileSync('c:\\Users\\ksnar\\Downloads\\ERP-NEW\\.env', 'utf8');
const getEnv = (key) => envContent.match(new RegExp(`${key}="(.*?)"`))?.[1];

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function removeDummyData() {
    try {
        const { data, error } = await supabase
            .from('inventory_batches')
            .delete()
            .like('lot_number', 'DMG-LOT-%');

        if (error) throw error;
        console.log("Successfully removed dummy data batches matching 'DMG-LOT-%'");
    } catch (err) {
        console.error("Error:", err.message);
    }
}

removeDummyData();
