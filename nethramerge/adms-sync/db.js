const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

let dir = __dirname;
let envPath;
while (dir) {
  const check = path.join(dir, '.env');
  if (fs.existsSync(check)) {
    envPath = check;
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
if (envPath) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const pool = new Pool({
  user: process.env.PG_USER || 'erp_admin',
  host: process.env.PG_HOST || '127.0.0.1',
  database: process.env.PG_DATABASE || 'shastika_erp',
  password: process.env.PG_PASSWORD,
  port: parseInt(process.env.PG_PORT || '5432', 10),
  connectionTimeoutMillis: 5000,   // fail fast if VPS unreachable
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', (err) => {
  console.error('❌ DB pool error:', err.message);
});

// Helper for single queries
module.exports = {
  query: (text, params) => pool.query(text, params),
};
