// Simple node script to load and dry-run check employees routes
const path = require('path');
const fs = require('fs');

console.log('--- STARTING EMPLOYEES ROUTE DRY RUN ---');

// Set dummy env variables to avoid Supabase connection/initialization issues
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dummy-url.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key';

try {
  const employeesRouter = require('../adms-sync/routes/employees.js');
  console.log('✅ Success: adms-sync/routes/employees.js loaded and compiled successfully!');
} catch (err) {
  console.error('❌ Failed to compile/load adms-sync/routes/employees.js:');
  console.error(err);
  process.exit(1);
}
