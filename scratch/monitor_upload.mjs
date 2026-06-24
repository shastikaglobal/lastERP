import { Client } from 'ssh2';

const conn = new Client();

conn.on('ready', () => {
  conn.exec('ls -1 /var/www/shastika-erp | wc -l; echo "---"; ls -1 /var/www/shastika-erp/assets | wc -l', (err, stream) => {
    if (err) throw err;
    let stdout = '';
    let stderr = '';
    stream.on('close', (code) => {
      console.log('--- VPS FILE COUNTS ---');
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
