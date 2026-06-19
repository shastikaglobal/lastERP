import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Try to find  file
const envPath = 'd:/ERP4/.env';
let supabaseUrl, supabaseAnonKey;

if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const lines = env.split('\n');
    lines.forEach(l => {
        if (l.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = l.split('=')[1].trim();
        if (l.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseAnonKey = l.split('=')[1].trim();
    });
}

// Fallback to searching in other common places or asking the user? 
// No, I'll just try to get it from the code.
// I'll use a simpler approach: check the profiles table via a dedicated script.

async function check() {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.log("Supabase credentials not found in .env");
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
            full_name,
            requested_role,
            user_roles(roles(slug))
        `);

    if (error) {
        console.error(error);
        return;
    }

    profiles.forEach(p => {
        const roles = p.user_roles.map(ur => ur.roles?.slug).join(', ');
        console.log(`User: ${p.full_name} | Requested: ${p.requested_role} | Actual Roles: [${roles}]`);
    });
}

check();
