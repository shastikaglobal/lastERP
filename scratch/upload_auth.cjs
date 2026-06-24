const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const localFile = 'adms-sync/middleware/auth.js';
    const remoteFile = '/var/www/adms-sync/middleware/auth.js';
    
    sftp.fastPut(localFile, remoteFile, (err) => {
      if (err) throw err;
      console.log('Successfully uploaded auth.js');
      
      conn.exec('pm2 restart adms-sync', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          conn.end();
        }).on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.error(data.toString());
        });
      });
    });
  });
}).connect({ host: '195.35.22.13', port: 22, username: 'root', password: 'SHASTIKARAM@2026' });
