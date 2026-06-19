import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSoftDeleteColumns() {
    const tables = ['leads', 'quotations', 'export_orders', 'warehouses', 'inventory_batches'];

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table} error:`, error.message);
            continue;
        }

        if (data && data.length > 0) {
            const hasIsDeleted = 'is_deleted' in data[0];
            console.log(`Table ${table} has is_deleted:`, hasIsDeleted);
        } else {
            console.log(`Table ${table} is empty, cannot check columns easily via select *`);
            // Try to select the column specifically
            const { error: colError } = await supabase.from(table).select('is_deleted').limit(1);
            console.log(`Table ${table} specifically selecting is_deleted:`, !colError);
        }
    }
}

checkSoftDeleteColumns();
