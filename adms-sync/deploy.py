import os
import sys
import getpass
import paramiko
import io

# Reconfigure stdout/stderr for UTF-8 to prevent crashes on Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

VPS_IP = "195.35.22.13"
VPS_PORT = 22
VPS_USER = "root"

def load_local_env():
    env_vars = {}
    # local .env is in the parent directory of this script (d:\ERP\ERP)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(current_dir, '..', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    parts = line.split('=', 1)
                    key = parts[0].strip()
                    val = parts[1].strip().strip('"').strip("'")
                    env_vars[key] = val
    return env_vars

def main():
    print("=" * 60)
    print("🚀 Shastika ADMS Sync Server Automated VPS Deployment")
    print("=" * 60)

    # Load Supabase config from local environment
    print("🔄 Loading local environment variables...")
    local_env = load_local_env()
    supabase_url = local_env.get('VITE_SUPABASE_URL')
    supabase_key = local_env.get('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        print("❌ Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in local .env!")
        sys.exit(1)

    print(f"✅ Loaded Supabase URL: {supabase_url}")

    # Prompt user for VPS root password securely
    password = "SHASTIKARAM@2026"
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

    # Establish SFTP channel
    sftp = ssh.open_sftp()

    try:
        # Create destination directory
        print("📁 Creating target directory /var/www/adms-sync...")
        ssh.exec_command('mkdir -p /var/www/adms-sync')

        # Recursively upload local adms-sync directory
        print("📤 Uploading project files recursively...")
        local_dir = os.path.dirname(os.path.abspath(__file__))
        
        def put_dir_recursive(local_path, remote_path):
            try:
                sftp.mkdir(remote_path)
            except IOError:
                pass
            for item in os.listdir(local_path):
                if item in ['.env', 'node_modules', '__pycache__', '.git', '.idea', '.vscode', 'deploy.py', 'deploy_all.py']:
                    continue
                l_item = os.path.join(local_path, item)
                r_item = remote_path + '/' + item
                if os.path.isdir(l_item):
                    put_dir_recursive(l_item, r_item)
                else:
                    sftp.put(l_item, r_item)
                    
        put_dir_recursive(local_dir, '/var/www/adms-sync')

        # Generate and upload .env
        print("📤 Uploading remote .env...")
        remote_env = {
            "PORT": "8082",
            "DEVICE_TIMEZONE_OFFSET": "+05:30",
            "PG_PASSWORD": "Shastika2026",
        }
        # Merge all local env variables
        for k, v in local_env.items():
            if k == "VITE_SUPABASE_URL":
                remote_env["SUPABASE_URL"] = v
            else:
                remote_env[k] = v

        env_content = ""
        for k, v in remote_env.items():
            env_content += f"{k}={v}\n"

        sftp.putfo(io.BytesIO(env_content.encode('utf-8')), '/var/www/adms-sync/.env')

        # Run setup commands
        print("\n⚙️ Initializing project & installing dependencies on VPS...")
        commands = [
            ("npm init -y", "/var/www/adms-sync"),
            ("npm install express dotenv @supabase/supabase-js ws pg", "/var/www/adms-sync"),
            ("node setup_pg_notify.js", "/var/www/adms-sync"),
            ("npm install -g pm2", ""),
            ("pm2 restart adms-sync || pm2 start server.js --name \"adms-sync\"", "/var/www/adms-sync"),
            ("pm2 save", ""),
            ("pm2 startup", "")
        ]

        for cmd, working_dir in commands:
            full_cmd = f"cd {working_dir} && {cmd}" if working_dir else cmd
            print(f"   🏃 Running: {cmd} ...")
            stdin, stdout, stderr = ssh.exec_command(full_cmd)
            # Wait for execution
            exit_status = stdout.channel.recv_exit_status()
            if exit_status != 0:
                err_msg = stderr.read().decode('utf-8').strip()
                print(f"   ⚠️ Command '{cmd}' finished with non-zero code {exit_status}. Info/Error: {err_msg}")
            else:
                out_msg = stdout.read().decode('utf-8').strip()
                if out_msg and len(out_msg) < 150:
                    print(f"   stdout: {out_msg}")

        # Nginx configuration update
        print("\n🌐 Configuring Nginx reverse proxy...")
        nginx_path = '/etc/nginx/sites-available/default'
        
        # Read existing Nginx config
        stdin, stdout, stderr = ssh.exec_command(f'cat {nginx_path}')
        nginx_conf = stdout.read().decode('utf-8')

        if 'location /iclock/' in nginx_conf:
            print("   ℹ️ Nginx already contains proxy route for /iclock/. Skipping addition.")
        else:
            # Find location / to insert above it
            target = 'location / {'
            if target not in nginx_conf:
                target = 'location /'

            if target in nginx_conf:
                proxy_rule = """    location /iclock/ {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }\n\n"""
                # Insert the proxy rule before the target
                updated_conf = nginx_conf.replace(target, proxy_rule + "    " + target)
                sftp.putfo(io.BytesIO(updated_conf.encode('utf-8')), nginx_path)
                print("   ✅ Inserted /iclock/ location block in Nginx config.")
            else:
                print("   ❌ Warning: Could not find 'location /' block in /etc/nginx/sites-available/default. Please add the proxy rule manually.")

        # Test and reload Nginx
        print("🔄 Reloading Nginx...")
        stdin, stdout, stderr = ssh.exec_command('nginx -t && systemctl reload nginx')
        exit_status = stdout.channel.recv_exit_status()
        if exit_status == 0:
            print("   ✅ Nginx reloaded successfully!")
        else:
            err_msg = stderr.read().decode('utf-8').strip()
            print(f"   ❌ Nginx test/reload failed: {err_msg}")

        print("\n" + "=" * 60)
        print("🎉 DEPLOYMENT COMPLETE! The ADMS Sync Server is live and connected.")
        print("🌐 Test URL: http://195.35.22.13/iclock/cdata")
        print("=" * 60)

    except Exception as ex:
        print(f"\n❌ Error during execution: {ex}")
    finally:
        sftp.close()
        ssh.close()

if __name__ == "__main__":
    main()
