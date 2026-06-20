import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: profiles } = await supabase.from('profiles').select('*');

    if (profiles && profiles.length > 0) {
        const companyId = profiles[0].company_id;
        const { data: exportOrders, error } = await supabase.from('export_orders').select('*').eq('company_id', companyId);

        fs.writeFileSync('output_clean.json', JSON.stringify({
            profilesCount: profiles.length,
            companyId: companyId,
            ordersLength: exportOrders?.length || 0,
            orders: exportOrders,
            error: error
        }, null, 2), 'utf-8');
    }
}

main().catch(console.error);
