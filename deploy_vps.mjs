import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VPS_IP = '195.35.22.13';
const VPS_PORT = 22;
const VPS_USER = 'root';
const VPS_PASSWORD = 'SHASTIKARAM@2026';

const REMOTE_FRONTEND = '/var/www/shastika-erp';
const REMOTE_BACKEND = '/var/www/adms-sync';

const LOCAL_ROOT = __dirname;
const LOCAL_BACKEND = path.join(LOCAL_ROOT, 'adms-sync');
const LOCAL_DIST = path.join(LOCAL_ROOT, 'dist');

function loadLocalEnv() {
  const envVars = {};
  const envPath = path.join(LOCAL_ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.includes('=')) {
        const [key, ...valParts] = line.split('=');
        const val = valParts.join('=').trim().replace(/^['"]|['"]$/g, '');
        envVars[key.trim()] = val;
      }
    }
  }
  return envVars;
}

function runCommand(conn, cmd, label = '') {
  return new Promise((resolve, reject) => {
    if (label) console.log(`   🏃 ${label}...`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code) => {
        if (code !== 0) {
          console.warn(`   ⚠️ Command completed with code ${code}. Stderr: ${stderr.trim()}`);
        } else if (stdout.trim()) {
          console.log(`   ✔ ${stdout.trim().substring(0, 200)}`);
        }
        resolve(code);
      }).on('data', (data) => {
        stdout += data.toString();
      }).stderr.on('data', (data) => {
        stderr += data.toString();
      });
    });
  });
}

async function uploadDir(sftp, localDir, remoteDir, skip = []) {
  try {
    await new Promise((resolve) => {
      sftp.mkdir(remoteDir, () => resolve());
    });
  } catch (e) {}

  const items = fs.readdirSync(localDir);
  for (const item of items) {
    if (skip.includes(item)) continue;
    const localPath = path.join(localDir, item);
    const remotePath = `${remoteDir}/${item}`;
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      await uploadDir(sftp, localPath, remotePath, skip);
    } else {
      console.log(`   📤 Uploading ${item} -> ${remotePath}...`);
      await new Promise((resolve, reject) => {
        sftp.fastPut(localPath, remotePath, (err) => {
          if (err) {
            console.error(`❌ Failed to upload ${localPath} to ${remotePath}:`, err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Shastika Global Impex — Node-based VPS Deployer');
  console.log('='.repeat(60));

  const localEnv = loadLocalEnv();
  
  const conn = new Client();
  
  conn.on('ready', async () => {
    console.log('📡 SSH Connected to VPS!');
    
    try {
      // 1. Database Backup
      console.log('\n💾 STEP 1 - Backing Up VPS PostgreSQL Database');
      await runCommand(conn, 'mkdir -p /var/backups/shastika-erp', 'Creating remote backup directory');
      const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const backupCmd = `PGPASSWORD="Shastika2026" pg_dump -h localhost -U postgres shastika_erp > /var/backups/shastika-erp/backup_${timestamp}.sql`;
      await runCommand(conn, backupCmd, `Executing pg_dump shastika_erp to backup_${timestamp}.sql`);
      // Keep only last 7 backups
      await runCommand(conn, 'ls -1t /var/backups/shastika-erp/backup_*.sql | tail -n +8 | xargs -r rm --', 'Pruning old backups');

      // Open SFTP
      const sftp = await new Promise((resolve, reject) => {
        conn.sftp((err, sftpInst) => {
          if (err) reject(err);
          else resolve(sftpInst);
        });
      });

      // 2. Upload Frontend
      console.log('\n📤 STEP 2 - Uploading Frontend Build');
      await runCommand(conn, `mkdir -p ${REMOTE_FRONTEND}`, 'Creating frontend remote directory');
      await runCommand(conn, `rm -rf ${REMOTE_FRONTEND}/*`, 'Clearing old frontend files');
      console.log('   Uploading local dist/ to VPS...');
      await uploadDir(sftp, LOCAL_DIST, REMOTE_FRONTEND);
      console.log('   ✅ Frontend files uploaded!');

      // 3. Upload Backend
      console.log('\n📤 STEP 3 - Uploading Backend (adms-sync)');
      await runCommand(conn, `mkdir -p ${REMOTE_BACKEND}`, 'Creating backend remote directory');
      console.log('   Uploading local adms-sync/ to VPS...');
      const skipBackend = ['.env', 'node_modules', '__pycache__', '.git', '.idea', '.vscode', 'deploy.py', 'deploy_all.py'];
      await uploadDir(sftp, LOCAL_BACKEND, REMOTE_BACKEND, skipBackend);
      console.log('   ✅ Backend files uploaded!');

      // 4. Construct and Upload .env
      console.log('\n📤 STEP 4 - Generating and Uploading Remote .env');
      const remoteEnv = {
        PORT: '8082',
        DEVICE_TIMEZONE_OFFSET: '+05:30',
        PG_PASSWORD: 'Shastika2026',
      };
      
      for (const [k, v] of Object.entries(localEnv)) {
        if (k === 'VITE_SUPABASE_URL') {
          remoteEnv['SUPABASE_URL'] = v;
        } else {
          remoteEnv[k] = v;
        }
      }

      let envContent = '';
      for (const [k, v] of Object.entries(remoteEnv)) {
        envContent += `${k}=${v}\n`;
      }

      const remoteEnvPath = `${REMOTE_BACKEND}/.env`;
      await new Promise((resolve, reject) => {
        const stream = sftp.createWriteStream(remoteEnvPath);
        stream.on('finish', () => resolve());
        stream.on('error', (err) => reject(err));
        stream.write(envContent);
        stream.end();
      });
      console.log('   ✅ Remote .env successfully written to VPS!');

      // 5. Install Deps & PM2 restart
      console.log('\n⚙️ STEP 5 - Installing Dependencies & Restarting Backend');
      await runCommand(conn, `cd ${REMOTE_BACKEND} && npm install express dotenv @supabase/supabase-js ws pg cors jsonwebtoken node-cron`, 'npm install on VPS');
      await runCommand(conn, `npm install -g pm2`, 'Ensure pm2 is installed globally');
      await runCommand(conn, `cd ${REMOTE_BACKEND} && (pm2 restart adms-sync || pm2 start server.js --name adms-sync)`, 'Restarting backend process on PM2');
      await runCommand(conn, 'pm2 save', 'Saving PM2 status');

      // 6. Nginx Config Check
      console.log('\n🌐 STEP 6 - Reloading Nginx');
      const nginxCheck = await runCommand(conn, "grep -q 'root /var/www/shastika-erp' /etc/nginx/sites-available/default");
      if (nginxCheck !== 0) {
        console.log('   ⚠️ Nginx root does not point to shastika-erp. Fetching configuration...');
        const nginxConf = await new Promise((resolve, reject) => {
          sftp.readFile('/etc/nginx/sites-available/default', 'utf-8', (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        const updatedConf = nginxConf.replace(/root\s+[^;]+;/, `root ${REMOTE_FRONTEND};`);
        await new Promise((resolve, reject) => {
          const stream = sftp.createWriteStream('/etc/nginx/sites-available/default');
          stream.on('finish', () => resolve());
          stream.on('error', (err) => reject(err));
          stream.write(updatedConf);
          stream.end();
        });
        console.log('   ✅ Nginx root updated in config.');
      }
      await runCommand(conn, 'nginx -t && systemctl reload nginx', 'Nginx configuration reload');

      // 7. DB Health Check
      console.log('\n🗄️ STEP 7 - Database Health Check');
      await runCommand(conn, 'pg_isready -h localhost -p 5432 -U postgres -d shastika_erp', 'pg_isready check');

      console.log('\n' + '='.repeat(60));
      console.log('🎉 DEPLOYMENT COMPLETE!');
      console.log('🌐 Site:    https://erp.shastikaglobalexport.co.in');
      console.log('🔧 API:     https://erp.shastikaglobalexport.co.in/api/');
      console.log('🗄️  DB:      PostgreSQL @ 195.35.22.13 (shastika_erp)');
      console.log('='.repeat(60));

      sftp.end();
      conn.end();
    } catch (err) {
      console.error('\n❌ Deployment failed during execution:', err);
      conn.end();
    }
  });

  conn.on('error', (err) => {
    console.error('❌ Connection error:', err);
  });

  conn.connect({
    host: VPS_IP,
    port: VPS_PORT,
    username: VPS_USER,
    password: VPS_PASSWORD,
  });
}

main();
