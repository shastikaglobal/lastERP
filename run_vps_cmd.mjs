import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  console.log('📡 SSH Connection Ready');
  conn.exec('ls /var/www/adms-sync/routes/security.js && pm2 restart adms-sync && sleep 3 && pm2 status adms-sync', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log(`Stream closed with code: ${code}`);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '195.35.22.13',
  port: 22,
  username: 'root',
  password: 'SHASTIKARAM@2026'
});
