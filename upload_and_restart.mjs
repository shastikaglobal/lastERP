import { Client } from 'ssh2';
import { readFileSync } from 'fs';

const conn = new Client();

// Use Node.js SFTP to upload the file then restart PM2
const localFile = readFileSync('d:/kaaru ERP/ERP/adms-sync/routes/security.js');

conn.on('ready', () => {
  console.log('📡 SSH Connection Ready - opening SFTP...');
  conn.sftp((err, sftp) => {
    if (err) { console.error('SFTP error:', err); conn.end(); return; }
    
    const remoteFile = '/var/www/adms-sync/routes/security.js';
    const writeStream = sftp.createWriteStream(remoteFile);
    
    writeStream.on('finish', () => {
      console.log('✅ security.js uploaded via SFTP!');
      sftp.end();
      
      // Now restart PM2
      conn.exec('pm2 restart adms-sync && sleep 3 && pm2 jlist | python3 -c "import sys,json; procs=json.load(sys.stdin); [print(p[\'name\'], p[\'pm2_env\'][\'status\'], p[\'pm2_env\'][\'restart_time\'], \'restarts\') for p in procs]"', (err2, stream) => {
        if (err2) { console.error('exec error:', err2); conn.end(); return; }
        stream.on('close', (code) => {
          console.log(`PM2 restart completed with code: ${code}`);
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.log('STDERR: ' + data);
        });
      });
    });
    
    writeStream.on('error', (err3) => {
      console.error('Write stream error:', err3);
      sftp.end();
      conn.end();
    });
    
    writeStream.write(localFile);
    writeStream.end();
  });
}).connect({
  host: '195.35.22.13',
  port: 22,
  username: 'root',
  password: 'SHASTIKARAM@2026'
});
