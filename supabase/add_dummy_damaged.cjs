const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env for keys
const envContent = fs.readFileSync('c:\\Users\\ksnar\\Downloads\\ERP-NEW\\.env', 'utf8');
const getEnv = (key) => envContent.match(new RegExp(`${key}="(.*?)"`))?.[1];

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addDummyDamagedData() {
    try {
        // 1. Get IDs
        const { data: companies } = await supabase.from('companies').select('id').limit(1);
        const { data: products } = await supabase.from('products').select('id').limit(1);
        const { data: warehouses } = await supabase.from('warehouses').select('id').limit(1);

        if (!companies?.[0] || !products?.[0] || !warehouses?.[0]) {
            console.error("Missing basic data (company/product/warehouse)");
            return;
        }

        const dummyBatch = {
            company_id: companies[0].id,
            lot_number: `DMG-LOT-${Math.floor(Math.random() * 10000)}`,
            product_id: products[0].id,
            warehouse_id: warehouses[0].id,
            quantity_kg: 500,
            quantity_remaining_kg: 500,
            grade: 'B',
            status: 'damaged',
            damaged_notes: 'Moisture damage during transport',
            received_date: new Date().toISOString().split('T')[0],
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        const { data, error } = await supabase.from('inventory_batches').insert(dummyBatch).select();

        if (error) throw error;
        console.log("Successfully added dummy damaged batch:", data);
    } catch (err) {
        console.error("Error:", err.message);
    }
}

addDummyDamagedData();
