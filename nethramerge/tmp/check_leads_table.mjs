import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLeadsTable() {
    const { data, error } = await supabase.from('leads').select('*').limit(1);
    if (error) {
        console.error('Error:', JSON.stringify(error));
    } else if (data && data.length > 0) {
        console.log('COLUMNS_LIST:' + JSON.stringify(Object.keys(data[0])));
        console.log('SAMPLE_DATA:' + JSON.stringify(data[0]));
    } else {
        console.log('Table is empty');
    }
}

checkLeadsTable();
