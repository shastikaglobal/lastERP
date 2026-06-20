import paramiko
import os
import sys

# Set standard output encoding to utf-8 if possible
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

VPS_IP       = "195.35.22.13"
VPS_PORT     = 22
VPS_USER     = "root"
VPS_PASSWORD = "SHASTIKARAM@2026"
REMOTE_DB_NAME  = "shastika_erp"
REMOTE_DB_USER  = "postgres"
REMOTE_DB_PASS  = "Shastika2026"
REMOTE_BACKUP_DIR = "/var/backups/shastika-erp"

def run_backup():
    print(f"Connecting to VPS {VPS_IP}:{VPS_PORT} ...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_IP, port=VPS_PORT, username=VPS_USER, password=VPS_PASSWORD, timeout=20)
    print("SSH connected!")

    sftp = ssh.open_sftp()
    
    # Create backup dir
    ssh.exec_command(f"mkdir -p {REMOTE_BACKUP_DIR}")
    
    # Run pg_dump
    backup_filename = "backup_pre_crm_clear.sql"
    remote_path = f"{REMOTE_BACKUP_DIR}/{backup_filename}"
    dump_cmd = f"PGPASSWORD='{REMOTE_DB_PASS}' pg_dump -h localhost -U {REMOTE_DB_USER} {REMOTE_DB_NAME} > {remote_path}"
    
    print(f"Running pg_dump on VPS: {dump_cmd}")
    stdin, stdout, stderr = ssh.exec_command(dump_cmd)
    exit_status = stdout.channel.recv_exit_status()
    
    if exit_status == 0:
        print(f"Remote backup saved: {remote_path}")
        # Download locally
        local_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backups")
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, backup_filename)
        print(f"Downloading backup locally to: {local_path}")
        sftp.get(remote_path, local_path)
        print("Download completed!")
    else:
        err = stderr.read().decode("utf-8")
        print(f"Backup failed! Error: {err}")

    sftp.close()
    ssh.close()

if __name__ == "__main__":
    run_backup()
