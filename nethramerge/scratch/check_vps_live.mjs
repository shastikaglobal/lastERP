import pg from 'pg';
import * as dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const { Client } = pg;

const config = {
  user: process.env.PG_USER || 'erp_admin',
  host: process.env.PG_HOST || '195.35.22.13',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  connectionTimeoutMillis: 8000,
};

console.log('═══════════════════════════════════════════════════');
console.log('  VPS PostgreSQL — Live Connection Diagnostic');
console.log('═══════════════════════════════════════════════════');
console.log(`  Host     : ${config.host}`);
console.log(`  Port     : ${config.port}`);
console.log(`  Database : ${config.database}`);
console.log(`  User     : ${config.user}`);
console.log(`  Password : ${config.password ? '***' + config.password.slice(-3) : '(not set)'}`);
console.log('═══════════════════════════════════════════════════\n');

const client = new Client(config);

try {
  process.stdout.write('🔌 Connecting to VPS PostgreSQL... ');
  await client.connect();
  console.log('✅ CONNECTED!\n');

  // 1. Server version & uptime
  const { rows: ver } = await client.query(`
    SELECT version(),
           now() AS server_time,
           pg_postmaster_start_time() AS started_at,
           age(now(), pg_postmaster_start_time()) AS uptime
  `);
  console.log('📊 Server Info:');
  console.log(`   Version    : ${ver[0].version.split(',')[0]}`);
  console.log(`   Server Time: ${ver[0].server_time}`);
  console.log(`   Started At : ${ver[0].started_at}`);
  console.log(`   Uptime     : ${ver[0].uptime}`);

  // 2. Table list with row counts
  const { rows: tables } = await client.query(`
    SELECT 
      t.table_name,
      COALESCE(s.n_live_tup, 0) AS row_count,
      pg_size_pretty(pg_total_relation_size(quote_ident(t.table_name))) AS size
    FROM information_schema.tables t
    LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
    WHERE t.table_schema = 'public'
    ORDER BY COALESCE(s.n_live_tup, 0) DESC
  `);

  console.log(`\n📋 Tables (${tables.length} total):`);
  console.log('   ─────────────────────────────────────────');
  console.log('   TABLE                        ROWS    SIZE');
  console.log('   ─────────────────────────────────────────');
  for (const t of tables) {
    const name = t.table_name.padEnd(28);
    const rows = String(t.row_count).padStart(6);
    const size = t.size.padStart(8);
    console.log(`   ${name} ${rows}  ${size}`);
  }

  // 3. Recent activity — last 10 attendance logs
  try {
    const { rows: recent } = await client.query(`
      SELECT date, employee_id, clock_in, clock_out, status
      FROM attendance_logs
      ORDER BY date DESC, clock_in DESC
      LIMIT 10
    `);
    if (recent.length > 0) {
      console.log(`\n🕐 Latest 10 Attendance Logs:`);
      for (const r of recent) {
        const cin = r.clock_in ? new Date(r.clock_in).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
        const cout = r.clock_out ? new Date(r.clock_out).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';
        console.log(`   ${r.date}  [${r.status}]  In: ${cin}  Out: ${cout}`);
      }
    }
  } catch (_) {
    console.log('\n⚠️  attendance_logs table not found or empty.');
  }

  // 4. Latest raw punch logs
  try {
    const { rows: punches } = await client.query(`
      SELECT "EmployeeCode", "LogDateTime", "Direction", "DeviceId"
      FROM "AttLogs"
      ORDER BY "DownloadDateTime" DESC
      LIMIT 5
    `);
    if (punches.length > 0) {
      console.log(`\n🔒 Last 5 Raw Punches (AttLogs):`);
      for (const p of punches) {
        console.log(`   EMP: ${p.EmployeeCode}  Time: ${p.LogDateTime}  Dir: ${p.Direction}  Device: ${p.DeviceId}`);
      }
    }
  } catch (_) {
    console.log('\n⚠️  AttLogs table not found or empty.');
  }

  // 5. DB size
  const { rows: dbSize } = await client.query(`
    SELECT pg_size_pretty(pg_database_size(current_database())) AS total_size
  `);
  console.log(`\n💾 Total DB Size: ${dbSize[0].total_size}`);

  console.log('\n✅ VPS PostgreSQL is LIVE and healthy!\n');

} catch (err) {
  console.log('❌ FAILED\n');
  console.error('Error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('\n💡 Port 5432 is reachable but connection refused. Check PostgreSQL is running on VPS.');
  } else if (err.code === 'EHOSTUNREACH' || err.code === 'ETIMEDOUT') {
    console.error('\n💡 Cannot reach VPS host. Possible reasons:');
    console.error('   • Your local network / firewall is blocking outbound port 5432');
    console.error('   • VPS firewall (ufw/iptables) is blocking port 5432');
    console.error('   • VPS is down');
    console.error(`\n   Try: Test-NetConnection ${config.host} -Port ${config.port}`);
  } else if (err.code === '28P01') {
    console.error('\n💡 Authentication failed — wrong password or user.');
  }
} finally {
  await client.end().catch(() => {});
}
