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

const LOCAL_ROOT = path.resolve(__dirname, '..');
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

// Concurrency helper
async function mapLimit(items, limit, fn) {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

// SFTP directory creator helper
async function ensureRemoteDir(sftp, remoteDir) {
  const parts = remoteDir.split('/');
  let current = '';
  for (const part of parts) {
    if (!part) continue;
    current += '/' + part;
    try {
      await new Promise((resolve) => {
        sftp.mkdir(current, () => resolve());
      });
    } catch (e) {}
  }
}

// Recursively gather all local files
function getFilesRecursive(dir, skip = []) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (skip.includes(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results = results.concat(getFilesRecursive(filePath, skip));
    } else {
      results.push(filePath);
    }
  }
  return results;
}

async function uploadFilesParallel(sftp, files, localBase, remoteBase, concurrency = 15) {
  let uploadedCount = 0;
  
  await mapLimit(files, concurrency, async (localPath) => {
    const relative = path.relative(localBase, localPath).replace(/\\/g, '/');
    const remotePath = `${remoteBase}/${relative}`;
    const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
    
    // Ensure remote directory exists
    await ensureRemoteDir(sftp, remoteDir);
    
    // Upload file
    await new Promise((resolve, reject) => {
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) {
          console.error(`❌ Failed to upload ${relative}:`, err.message);
          reject(err);
        } else {
          uploadedCount++;
          if (uploadedCount % 20 === 0 || uploadedCount === files.length) {
            console.log(`      Uploaded ${uploadedCount}/${files.length} files...`);
          }
          resolve();
        }
      });
    });
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 Fast Parallel VPS Deployer');
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
      await runCommand(conn, 'ls -1t /var/backups/shastika-erp/backup_*.sql | tail -n +8 | xargs -r rm --', 'Pruning old backups');

      // Open SFTP
      const sftp = await new Promise((resolve, reject) => {
        conn.sftp((err, sftpInst) => {
          if (err) reject(err);
          else resolve(sftpInst);
        });
      });

      // 2. Upload Frontend
      console.log('\n📤 STEP 2 - Uploading Frontend Build (Parallel)');
      await runCommand(conn, `mkdir -p ${REMOTE_FRONTEND}`, 'Creating frontend remote directory');
      await runCommand(conn, `rm -rf ${REMOTE_FRONTEND}/*`, 'Clearing remote frontend files');
      
      console.log('   Gathering frontend files...');
      const frontendFiles = getFilesRecursive(LOCAL_DIST);
      console.log(`   Found ${frontendFiles.length} files. Uploading with concurrency = 15...`);
      await uploadFilesParallel(sftp, frontendFiles, LOCAL_DIST, REMOTE_FRONTEND, 15);
      console.log('   ✅ Frontend files successfully uploaded!');

      // 3. Upload Backend
      console.log('\n📤 STEP 3 - Uploading Backend (Parallel)');
      await runCommand(conn, `mkdir -p ${REMOTE_BACKEND}`, 'Creating backend remote directory');
      
      console.log('   Gathering backend files...');
      const skipBackend = ['.env', 'node_modules', '__pycache__', '.git', '.idea', '.vscode', 'deploy.py', 'deploy_all.py'];
      const backendFiles = getFilesRecursive(LOCAL_BACKEND, skipBackend);
      console.log(`   Found ${backendFiles.length} files. Uploading...`);
      await uploadFilesParallel(sftp, backendFiles, LOCAL_BACKEND, REMOTE_BACKEND, 15);
      console.log('   ✅ Backend files successfully uploaded!');

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
        sftp.writeFile(remoteEnvPath, envContent, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('   ✅ Remote .env successfully written to VPS!');

      // 5. Install Deps & PM2 restart
      console.log('\n⚙️ STEP 5 - Installing Dependencies & Restarting Backend');
      await runCommand(conn, `cd ${REMOTE_BACKEND} && npm install`, 'npm install on VPS');
      await runCommand(conn, `cd ${REMOTE_BACKEND} && (pm2 restart adms-sync || pm2 start server.js --name adms-sync)`, 'Restarting backend process on PM2');
      await runCommand(conn, 'pm2 save', 'Saving PM2 status');

      // 6. Nginx Config Check and Reload
      console.log('\n🌐 STEP 6 - Reloading Nginx');
      await runCommand(conn, 'nginx -t && systemctl reload nginx', 'Nginx configuration reload');

      console.log('\n' + '='.repeat(60));
      console.log('🎉 FAST DEPLOYMENT COMPLETE!');
      console.log('🌐 Site:    https://erp.shastikaglobalexport.co.in');
      console.log('='.repeat(60));

      sftp.end();
      conn.end();
    } catch (err) {
      console.error('\n❌ Fast deployment failed during execution:', err);
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
