import os
import sys
import getpass
import paramiko

# Reconfigure stdout/stderr for UTF-8 to prevent crashes on Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

VPS_IP = "195.35.22.13"
VPS_PORT = 22
VPS_USER = "root"

def main():
    print("=" * 60)
    print("🔍 VPS Diagnostics v2 - Deep Dive Log & Config Reader")
    print("=" * 60)

    password = getpass.getpass(f"🔐 Enter root password for Hostinger VPS ({VPS_IP}): ")
    if not password:
        print("❌ Error: Password cannot be empty.")
        sys.exit(1)

    # Establish SSH connection
    print(f"\n📡 Connecting to VPS at {VPS_IP}:{VPS_PORT}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        ssh.connect(VPS_IP, port=VPS_PORT, username=VPS_USER, password=password, timeout=15)
        print("✅ SSH Connection established successfully!")
    except Exception as e:
        print(f"❌ Failed to connect to VPS: {e}")
        sys.exit(1)

    commands = [
        ("PM2 Error Logs", "cat /root/.pm2/logs/adms-sync-error.log | tail -n 30"),
        ("PM2 Out Logs", "cat /root/.pm2/logs/adms-sync-out.log | tail -n 30"),
        ("Nginx Site: erp", "cat /etc/nginx/sites-enabled/erp"),
        ("Nginx Site: shastika", "cat /etc/nginx/sites-enabled/shastika"),
        ("Nginx Site: globalairtech.co.in", "cat /etc/nginx/sites-enabled/globalairtech.co.in")
    ]

    for title, cmd in commands:
        print("\n" + "-" * 50)
        print(f"📋 {title} [Command: {cmd}]")
        print("-" * 50)
        try:
            stdin, stdout, stderr = ssh.exec_command(cmd)
            exit_status = stdout.channel.recv_exit_status()
            out = stdout.read().decode('utf-8').strip()
            err = stderr.read().decode('utf-8').strip()
            
            if out:
                print(out)
            if err:
                print(f"Stderr/Info:\n{err}")
            if not out and not err:
                print("(No output)")
        except Exception as e:
            print(f"Error running command: {e}")

    ssh.close()

if __name__ == "__main__":
    main()
