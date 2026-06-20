import paramiko
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

VPS_IP = '195.35.22.13'
VPS_USER = 'root'
VPS_PASSWORD = 'SHASTIKARAM@2026'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASSWORD, timeout=15)

def run(cmd, title):
    print(f'\n{"="*60}')
    print(f'  {title}')
    print(f'{"="*60}')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out: print(out)
    if err: print('STDERR:', err[:500])

run('pm2 status', '🔄 PM2 Process List')
run('systemctl is-active nginx && nginx -t 2>&1', '🌐 Nginx Status')
run('cat /etc/nginx/sites-available/default', '🌐 Nginx Config (full)')
run('pg_isready -h localhost -p 5432 && psql -U erp_admin -d shastika_erp -c "SELECT tablename FROM pg_tables WHERE schemaname=\'public\' ORDER BY tablename;" 2>&1', '🗄️ PostgreSQL Tables')
run('ls /var/www/', '📁 /var/www contents')
run('ls /var/www/adms-sync/routes/', '📁 Backend Routes')
run('ls /var/www/shastika-erp/', '📁 Frontend Files')
run('curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/api/employees 2>&1 || echo "FAILED"', '⚙️ Backend API Health (port 8082)')
run('cat /root/.pm2/logs/adms-sync-error.log | tail -n 20', '❌ PM2 Error Logs (last 20 lines)')
run('cat /root/.pm2/logs/adms-sync-out.log | tail -n 20', '📋 PM2 Output Logs (last 20 lines)')
run('ufw status', '🔒 Firewall Rules')
run('df -h', '💾 Disk Usage')
run('free -h', '🧠 Memory Usage')
run('crontab -l 2>&1 || echo "no crontab"', '⏰ Cron Jobs')
run('ls /etc/letsencrypt/live/ 2>&1', '🔐 SSL Certificates')

ssh.close()
print('\n\n✅ Audit complete.')
