import { Client } from 'ssh2';

const conn = new Client();

function runCommand(conn, cmd, title) {
  return new Promise((resolve) => {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60));
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error('Exec error:', err);
        return resolve();
      }
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        if (stdout.trim()) console.log(stdout.trim());
        if (stderr.trim()) console.error('STDERR:', stderr.trim());
        resolve();
      }).on('data', (data) => {
        stdout += data.toString();
      }).stderr.on('data', (data) => {
        stderr += data.toString();
      });
    });
  });
}

conn.on('ready', async () => {
  try {
    await runCommand(conn, 'pm2 list', 'PM2 Process List');
    await runCommand(conn, 'tail -n 40 /var/log/nginx/error.log', 'Latest Nginx error logs');
    conn.end();
  } catch (err) {
    console.error('Error during execution:', err);
    conn.end();
  }
});

conn.connect({
  host: '195.35.22.13',
  port: 22,
  username: 'root',
  password: 'SHASTIKARAM@2026'
});
