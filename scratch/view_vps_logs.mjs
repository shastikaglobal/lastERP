import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  conn.exec('tail -n 40 /root/.pm2/logs/adms-sync-out.log; echo "--- ERROR LOGS ---"; tail -n 40 /root/.pm2/logs/adms-sync-error.log', (err, stream) => {
    if (err) throw err;
    let stdout = '';
    let stderr = '';
    stream.on('close', (code) => {
      console.log('--- VPS PM2 DIRECT LOGS ---');
      console.log(stdout);
      if (stderr) console.error('STDERR:', stderr);
      conn.end();
    }).on('data', (data) => {
      stdout += data.toString();
    }).stderr.on('data', (data) => {
      stderr += data.toString();
    });
  });
}).connect({
  host: '195.35.22.13',
  port: 22,
  username: 'root',
  password: 'SHASTIKARAM@2026'
});
