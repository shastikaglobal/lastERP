/**
 * db_live.mjs — Interactive Live VPS PostgreSQL Tool
 * Usage: node db_live.mjs [command] [args]
 *
 * Commands:
 *   tables              — List all tables with row counts
 *   size                — Show DB + table sizes
 *   connections         — Show active connections
 *   query "SQL"         — Run any custom SQL query
 *   peek <table>        — Show first 10 rows of a table
 *   count <table>       — Count rows in a table
 *   schema <table>      — Show columns of a table
 *   help                — Show this help
 *
 * Examples:
 *   node db_live.mjs tables
 *   node db_live.mjs peek orders
 *   node db_live.mjs query "SELECT * FROM profiles LIMIT 5"
 *   node db_live.mjs size
 */

import pg from 'pg';
import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '.env') });

const { Client } = pg;

const DB_CONFIG = {
  user:     process.env.PG_USER     || 'postgres',
  host:     process.env.PG_HOST     || '195.35.22.13',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD || 'Shastika2026',
  port:     parseInt(process.env.PG_PORT || '5432', 10),
  connectionTimeoutMillis: 8000,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function hr(char = '─', len = 60) { return char.repeat(len); }

function printTable(rows) {
  if (!rows || rows.length === 0) { console.log('  (no rows)'); return; }
  const keys = Object.keys(rows[0]);
  const widths = keys.map(k => Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length)));
  const header = keys.map((k, i) => k.padEnd(widths[i])).join('  │  ');
  const divider = widths.map(w => '─'.repeat(w)).join('──┼──');
  console.log('  ' + header);
  console.log('  ' + divider);
  rows.forEach(r => {
    console.log('  ' + keys.map((k, i) => String(r[k] ?? '').padEnd(widths[i])).join('  │  '));
  });
  console.log(`\n  (${rows.length} row${rows.length !== 1 ? 's' : ''})`);
}

async function withClient(fn) {
  const client = new Client(DB_CONFIG);
  try {
    await client.connect();
    await fn(client);
  } catch (err) {
    console.error(`\n❌  Error: ${err.message}`);
  } finally {
    await client.end();
  }
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function cmdTables(client) {
  console.log(`\n${hr()}`);
  console.log('📋  All Tables with Row Counts');
  console.log(hr());
  const { rows } = await client.query(`
    SELECT
      t.table_name,
      COALESCE(s.n_live_tup, 0) AS row_count
    FROM information_schema.tables t
    LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
    WHERE t.table_schema = 'public'
    ORDER BY s.n_live_tup DESC NULLS LAST, t.table_name
  `);
  printTable(rows);
}

async function cmdSize(client) {
  console.log(`\n${hr()}`);
  console.log('💾  Database & Table Sizes');
  console.log(hr());

  const { rows: [dbSize] } = await client.query(`
    SELECT pg_size_pretty(pg_database_size(current_database())) AS total_db_size
  `);
  console.log(`\n  Total DB Size: ${dbSize.total_db_size}\n`);

  const { rows } = await client.query(`
    SELECT
      tablename AS table_name,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
      pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS data_size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 20
  `);
  printTable(rows);
}

async function cmdConnections(client) {
  console.log(`\n${hr()}`);
  console.log('🔌  Active DB Connections');
  console.log(hr());
  const { rows } = await client.query(`
    SELECT
      pid,
      usename AS user,
      application_name AS app,
      client_addr AS client,
      state,
      LEFT(query, 60) AS query
    FROM pg_stat_activity
    WHERE datname = current_database()
    ORDER BY state, pid
  `);
  printTable(rows);
}

async function cmdQuery(client, sql) {
  console.log(`\n${hr()}`);
  console.log(`🔍  Running: ${sql}`);
  console.log(hr());
  const { rows, rowCount } = await client.query(sql);
  if (rows.length > 0) {
    printTable(rows);
  } else {
    console.log(`  ✅ Query OK — ${rowCount} row(s) affected.`);
  }
}

async function cmdPeek(client, table) {
  console.log(`\n${hr()}`);
  console.log(`👀  First 10 rows of: ${table}`);
  console.log(hr());
  const { rows } = await client.query(`SELECT * FROM "${table}" LIMIT 10`);
  printTable(rows);
}

async function cmdCount(client, table) {
  const { rows } = await client.query(`SELECT COUNT(*) AS count FROM "${table}"`);
  console.log(`\n  📊 ${table}: ${rows[0].count} rows`);
}

async function cmdSchema(client, table) {
  console.log(`\n${hr()}`);
  console.log(`🏗️   Schema of: ${table}`);
  console.log(hr());
  const { rows } = await client.query(`
    SELECT
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [table]);
  printTable(rows);
}

function showHelp() {
  console.log(`
${hr('═')}
  🗄️   db_live.mjs — Live VPS PostgreSQL Tool
  Host: ${DB_CONFIG.host}  DB: ${DB_CONFIG.database}
${hr('═')}

  Commands:
    node db_live.mjs tables              List all tables + row counts
    node db_live.mjs size                Show DB and table sizes
    node db_live.mjs connections         Show active connections
    node db_live.mjs peek <table>        Show first 10 rows
    node db_live.mjs count <table>       Count rows in a table
    node db_live.mjs schema <table>      Show table columns
    node db_live.mjs query "<SQL>"       Run any SQL query

  Examples:
    node db_live.mjs tables
    node db_live.mjs peek orders
    node db_live.mjs count profiles
    node db_live.mjs schema shipments
    node db_live.mjs query "SELECT id, name FROM products LIMIT 5"
${hr('═')}
`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const [,, cmd, ...rest] = process.argv;

console.log(`\n🌐  Connecting to ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database} ...`);

switch (cmd) {
  case 'tables':
    await withClient(cmdTables);
    break;

  case 'size':
    await withClient(cmdSize);
    break;

  case 'connections':
    await withClient(cmdConnections);
    break;

  case 'query':
    if (!rest[0]) { console.error('Usage: node db_live.mjs query "<SQL>"'); process.exit(1); }
    await withClient(c => cmdQuery(c, rest.join(' ')));
    break;

  case 'peek':
    if (!rest[0]) { console.error('Usage: node db_live.mjs peek <table>'); process.exit(1); }
    await withClient(c => cmdPeek(c, rest[0]));
    break;

  case 'count':
    if (!rest[0]) { console.error('Usage: node db_live.mjs count <table>'); process.exit(1); }
    await withClient(c => cmdCount(c, rest[0]));
    break;

  case 'schema':
    if (!rest[0]) { console.error('Usage: node db_live.mjs schema <table>'); process.exit(1); }
    await withClient(c => cmdSchema(c, rest[0]));
    break;

  case 'help':
  default:
    showHelp();
    break;
}
