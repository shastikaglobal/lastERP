const { Client } = require('ssh2');
const path = require('path');

const conn = new Client();

const localFilePath = path.join(__dirname, '..', 'adms-sync', 'routes', 'farmers.js');
const remoteFilePath = '/var/www/adms-sync/routes/farmers.js';

console.log('Local file:', localFilePath);
console.log('Remote file:', remoteFilePath);

conn.on('ready', () => {
  console.log('📡 SSH Connection Ready - opening SFTP...');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      return;
    }
    
    console.log('Uploading using fastPut...');
    sftp.fastPut(localFilePath, remoteFilePath, (err3) => {
      if (err3) {
        console.error('Upload failed:', err3);
        sftp.end();
        conn.end();
        return;
      }
      
      console.log('✅ farmers.js uploaded successfully via fastPut!');
      sftp.end();
      
      // Restart PM2 process
      console.log('Restarting backend process (pm2 restart adms-sync)...');
      conn.exec('pm2 restart adms-sync && sleep 2 && pm2 status', (err2, stream) => {
        if (err2) {
          console.error('exec error:', err2);
          conn.end();
          return;
        }
        stream.on('close', (code) => {
          console.log(`PM2 restart completed with code: ${code}`);
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT:\n' + data);
        }).stderr.on('data', (data) => {
          console.log('STDERR:\n' + data);
        });
      });
    });
  });
}).connect({
  host: '195.35.22.13',
  port: 22,
  username: 'root',
  password: 'SHASTIKARAM@2026'
});
