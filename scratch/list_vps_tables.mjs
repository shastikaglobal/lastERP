import pg from "pg";
import * as dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const pool = new pg.Pool({
  user: process.env.PG_USER || "erp_admin",
  host: process.env.PG_HOST || "127.0.0.1",
  database: process.env.PG_DATABASE || "shastika_erp",
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || "5432", 10),
});

const { rows } = await pool.query(`
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  ORDER BY table_name
`);

console.log("=== VPS DB Tables ===");
rows.forEach(r => console.log(" -", r.table_name));
console.log(`\nTotal: ${rows.length} tables`);

await pool.end();
