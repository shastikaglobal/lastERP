import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Since we need to delete, let's use the UI key if RLS allows it.
// Wait, export_orders might have RLS. Let's try with the anon key, but we would need an active session.
// So we can use the supabase anon key but let's test. If it fails, maybe there's no RLS or RLS allows delete for anyone (which is bad but possible).
// Actually, earlier the user logged in. Let's just create a client and let it try.
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: profiles } = await supabase.from('profiles').select('*');

    if (profiles && profiles.length > 0) {
        const companyId = profiles[0].company_id;
        console.log("Deleting export orders for company:", companyId);

        const { data, error } = await supabase
            .from('export_orders')
            .delete()
            .eq('company_id', companyId);

        console.log('Delete error?', error);
        console.log('Deleted data?', data);
    }
}

main().catch(console.error);
