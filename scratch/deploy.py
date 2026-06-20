import paramiko
import os
import tarfile

VPS_IP = '195.35.22.13'
VPS_USER = 'root'
VPS_PASSWORD = 'SHASTIKARAM@2026'
REMOTE_DIR = '/var/www/shastika-erp'
LOCAL_DIR = '../dist'

print("Creating tar.gz archive of dist folder...")
with tarfile.open('dist.tar.gz', 'w:gz') as tar:
    tar.add(LOCAL_DIR, arcname='.')

print("Connecting to VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, port=22, username=VPS_USER, password=VPS_PASSWORD, timeout=15)

print("Uploading dist.tar.gz...")
sftp = ssh.open_sftp()
sftp.put('dist.tar.gz', '/tmp/dist.tar.gz')
sftp.close()

print("Extracting files on VPS...")
commands = [
    f"rm -rf {REMOTE_DIR}/*",
    f"tar -xzf /tmp/dist.tar.gz -C {REMOTE_DIR}/",
    "rm /tmp/dist.tar.gz"
]

for cmd in commands:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.recv_exit_status()

print("Deployment successful!")
ssh.close()
