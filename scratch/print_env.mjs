import dotenvConfig from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig.config({ path: path.join(__dirname, '../.env') });

console.log("Environment variables related to network / proxy:");
const proxyKeys = [
  'HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 
  'NO_PROXY', 'no_proxy', 'NODE_EXTRA_CA_CERTS', 'NODE_TLS_REJECT_UNAUTHORIZED'
];

proxyKeys.forEach(k => {
  console.log(`${k}: ${process.env[k] || 'not defined'}`);
});

console.log("\nSupabase URL:", process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
