const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  console.log('Connected!');
  conn.exec(`echo "global.fetch = require('node-fetch');" | cat - /var/www/adms-sync/server.js > /tmp/out && mv /tmp/out /var/www/adms-sync/server.js && pm2 restart adms-sync`, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', d => console.log(d.toString()))
          .stderr.on('data', d => console.error(d.toString()));
  });
}).connect({ host: '195.35.22.13', port: 22, username: 'root', password: 'SHASTIKARAM@2026' });
