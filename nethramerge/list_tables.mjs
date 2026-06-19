import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
    const { data, error } = await supabase.rpc('get_all_tables');
    if (error) {
        // If RPC doesn't exist, try to list some common ones or use a more clever way
        console.log("RPC get_all_tables failed. Trying alternative...");

        // Fallback: try to query information_schema if permissions allow (usually not for anon key)
        // But since I have the .env, I might have a service role key in my thought earlier?
        // No, I only have the ANON key.

        // Let's try to find where tables are defined in the code.
        // Usually src/integrations/supabase/types.ts has them.
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

listAllTables();
