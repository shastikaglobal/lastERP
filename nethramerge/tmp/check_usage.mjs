import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDatabaseUsage() {
    const tables = ['leads', 'attendance_logs', 'face_scan_events', 'profiles', 'customers'];
    let output = "=== DATABASE USAGE SUMMARY ===\n";

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            output += `Table ${table}: ERROR (${error.message})\n`;
        } else {
            output += `Table ${table}: ${count} rows\n`;
        }
    }

    // Estimate size (roughly 1KB per row for text data)
    console.log(output);
}

checkDatabaseUsage();
