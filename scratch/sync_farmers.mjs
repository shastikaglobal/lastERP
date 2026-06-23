import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const pool = new Pool({
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: parseInt(process.env.PG_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

async function syncFarmers() {
  try {
    console.log("Fetching all farmers from Supabase...");
    const { data: sbFarmers, error: sbError } = await supabase
      .from('farmers')
      .select('*');

    if (sbError) {
      throw new Error(`Supabase fetch failed: ${sbError.message}`);
    }

    console.log(`Found ${sbFarmers.length} farmers in Supabase.`);

    console.log("Syncing to VPS database...");
    for (const farmer of sbFarmers) {
      const query = `
        INSERT INTO farmers (
          id, company_id, code, full_name, email, phone, village, district, state, country, 
          primary_crops, bank_account, notes, is_active, is_deleted, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (id) DO UPDATE SET
          company_id = EXCLUDED.company_id,
          code = EXCLUDED.code,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          village = EXCLUDED.village,
          district = EXCLUDED.district,
          state = EXCLUDED.state,
          country = EXCLUDED.country,
          primary_crops = EXCLUDED.primary_crops,
          bank_account = EXCLUDED.bank_account,
          notes = EXCLUDED.notes,
          is_active = EXCLUDED.is_active,
          is_deleted = EXCLUDED.is_deleted,
          updated_at = EXCLUDED.updated_at
      `;

      await pool.query(query, [
        farmer.id,
        farmer.company_id,
        farmer.code || null,
        farmer.full_name,
        farmer.email || null,
        farmer.phone || null,
        farmer.village || null,
        farmer.district || null,
        farmer.state || null,
        farmer.country || null,
        farmer.primary_crops || null,
        farmer.bank_account || null,
        farmer.notes || null,
        farmer.is_active ?? true,
        farmer.is_deleted ?? false,
        farmer.created_at,
        farmer.updated_at
      ]);
    }

    console.log("✅ Farmers synced successfully!");

    // Also mark any farmers in VPS not in Supabase as deleted
    const sbIds = sbFarmers.map(f => f.id);
    if (sbIds.length > 0) {
      const { rowCount } = await pool.query(
        `UPDATE farmers SET is_deleted = true WHERE id NOT IN (${sbIds.map((_, i) => `$${i + 1}`).join(', ')})`,
        sbIds
      );
      console.log(`Marked ${rowCount} local-only farmers as deleted in VPS.`);
    }

  } catch (err) {
    console.error("❌ Sync failed:", err.message);
  } finally {
    await pool.end();
  }
}

syncFarmers();
