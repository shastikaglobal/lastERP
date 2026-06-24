const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('Connected!');
  conn.exec(`sed -i 's/createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)/createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, { global: { fetch: require("node-fetch") } })/g' /var/www/adms-sync/middleware/auth.js && pm2 restart adms-sync`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', d => console.log(d.toString()))
          .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({ host: '195.35.22.13', port: 22, username: 'root', password: 'SHASTIKARAM@2026' });
