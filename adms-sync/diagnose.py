import os
import sys
import getpass
import paramiko

VPS_IP = "195.35.22.13"
VPS_PORT = 22
VPS_USER = "root"

def main():
    print("=" * 60)
    print("🔍 VPS Diagnostics for ADMS Sync Server")
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
        ("PM2 Process Status", "pm2 status"),
        ("PM2 Logs (Recent)", "pm2 logs adms-sync --limit 20 --raw --no-color"),
        ("Listening Ports Check", "ss -tulpn | grep 8082 || netstat -tulnp | grep 8082"),
        ("Local HTTP Server Check", "curl -i http://127.0.0.1:8082/iclock/cdata?SN=TEST"),
        ("Nginx Config Check (Sites Available)", "cat /etc/nginx/sites-available/default"),
        ("Nginx Enabled Sites Link Check", "ls -l /etc/nginx/sites-enabled/"),
        ("Nginx Test Syntax", "nginx -t")
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
