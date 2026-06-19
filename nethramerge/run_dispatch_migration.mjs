import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = Object.fromEntries(envFile.split(/\r?\n/).filter(Boolean).map((line) => {
  const idx = line.indexOf('=');
  if (idx === -1) return [line, ''];
  const key = line.slice(0, idx);
  let value = line.slice(idx + 1);
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  return [key, value];
}));

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const migrationPath = 'supabase/migrations/20260612150000_create_dispatch_tables.sql';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const migrationSql = fs.readFileSync(migrationPath, 'utf8');

async function runSql(endpoint, query) {
  const url = `${SUPABASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

async function main() {
  console.log(`Running dispatch migration via ${SUPABASE_URL}/sql`);
  const result = await runSql('/sql', migrationSql);

  if (result.ok) {
    console.log('✅ Migration applied successfully.');
    console.log(result.text);
    return;
  }

  console.warn(`⚠️ /sql endpoint failed with status ${result.status}`);
  console.warn(result.text);
  console.log('Trying /pg/query fallback...');

  const fallback = await runSql('/pg/query', migrationSql);
  if (fallback.ok) {
    console.log('✅ Migration applied successfully via /pg/query.');
    console.log(fallback.text);
    return;
  }

  console.error(`❌ Fallback also failed with status ${fallback.status}`);
  console.error(fallback.text);
  process.exit(1);
}

await main();
