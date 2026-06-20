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

run('nslookup erp.shastikaglobalexport.co.in', 'DNS resolution from VPS')

ssh.close()
