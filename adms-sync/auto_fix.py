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

def main():
    print("=" * 60)
    print("🔧 Shastika ADMS Sync Server Automated Auto-Fix Script")
    print("=" * 60)

    password = "SHASTIKARAM#@97may"

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

    sftp = ssh.open_sftp()

    try:
        # 1. Check Node.js version
        print("\n🔍 Checking Node.js version on VPS...")
        stdin, stdout, stderr = ssh.exec_command("node -v")
        node_version = stdout.read().decode('utf-8').strip()
        print(f"Node.js Version: {node_version}")

        # 2. Check PM2 Error Logs
        print("\n📋 Fetching PM2 error logs...")
        stdin, stdout, stderr = ssh.exec_command("cat /root/.pm2/logs/adms-sync-error.log | tail -n 25")
        error_logs = stdout.read().decode('utf-8').strip()
        print("--- PM2 ERROR LOGS ---")
        print(error_logs)
        print("----------------------")

        # 3. Always install ws and determine if we need fetch polyfill
        print("   🏃 Installing ws package on VPS...")
        stdin, stdout, stderr = ssh.exec_command("cd /var/www/adms-sync && npm install ws")
        stdout.channel.recv_exit_status()

        needs_fetch_polyfill = False
        if "fetch is not defined" in error_logs or "ReferenceError: fetch" in error_logs:
            print("💡 Detected 'fetch is not defined' error. Adding node-fetch polyfill...")
            needs_fetch_polyfill = True
        elif node_version.startswith("v") and int(node_version.split(".")[0][1:]) < 18:
            print("💡 Node version is < 18. Adding node-fetch polyfill to ensure Supabase client works...")
            needs_fetch_polyfill = True

        current_dir = os.path.dirname(os.path.abspath(__file__))
        local_server_js = os.path.join(current_dir, 'server.js')

        if needs_fetch_polyfill:
            print("   🏃 Installing node-fetch on VPS...")
            stdin, stdout, stderr = ssh.exec_command("cd /var/www/adms-sync && npm install node-fetch@2")
            stdout.channel.recv_exit_status()
            
            # Rewrite server.js locally to include fetch polyfill
            with open(local_server_js, 'r', encoding='utf-8') as f:
                server_code = f.read()

            polyfill_code = """// Polyfill fetch for older Node.js versions
if (!globalThis.fetch) {
  globalThis.fetch = require('node-fetch');
}
"""
            if "node-fetch" not in server_code:
                server_code = polyfill_code + server_code
                with open(local_server_js, 'w', encoding='utf-8') as f:
                    f.write(server_code)
                print("   ✅ Updated server.js locally with fetch polyfill.")
            
        # Upload updated server.js (which always contains the ws setup now)
        print("   📤 Uploading updated server.js to VPS...")
        sftp.put(local_server_js, '/var/www/adms-sync/server.js')

        # 4. Restart PM2 process
        print("\n🔄 Restarting PM2 process...")
        stdin, stdout, stderr = ssh.exec_command("pm2 restart adms-sync || pm2 start /var/www/adms-sync/server.js --name \"adms-sync\"")
        stdout.channel.recv_exit_status()
        
        # Verify status
        stdin, stdout, stderr = ssh.exec_command("pm2 status")
        stdout.channel.recv_exit_status()
        print(stdout.read().decode('utf-8'))

        # 5. Fix Nginx Configurations in sites-enabled
        print("\n🌐 Configuring active Nginx files in sites-enabled...")
        
        # List files in sites-enabled
        stdin, stdout, stderr = ssh.exec_command("ls -1 /etc/nginx/sites-enabled/")
        stdout.channel.recv_exit_status()
        nginx_files = stdout.read().decode('utf-8').strip().split('\n')
        print(f"Active Nginx configuration files: {nginx_files}")

        proxy_rule = """    location /iclock/ {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }\n\n"""

        for name in nginx_files:
            name = name.strip()
            if not name:
                continue
            
            file_path = f"/etc/nginx/sites-enabled/{name}"
            print(f"   📄 Processing {file_path}...")
            
            # Read file content
            stdin, stdout, stderr = ssh.exec_command(f"cat {file_path}")
            stdout.channel.recv_exit_status()
            content = stdout.read().decode('utf-8')
            
            if 'location /iclock/' in content:
                print(f"   ℹ️ {file_path} already contains location /iclock/. Skipping.")
                continue

            # Insert proxy rule before location /
            target = 'location / {'
            if target not in content:
                target = 'location /'

            if target in content:
                updated_content = content.replace(target, proxy_rule + "    " + target)
                # Write file back
                sftp.putfo(io.BytesIO(updated_content.encode('utf-8')), file_path)
                print(f"   ✅ Successfully added location /iclock/ proxy to {file_path}!")
            else:
                print(f"   ⚠️ Could not find 'location /' block in {file_path}. Skipping.")

        # Overwrite default Nginx configuration with a clean default_server setup
        print("\n📝 Overwriting default server configuration with clean config...")
        default_config = """server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;

    server_name _;

    location /iclock/ {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering off;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
"""
        sftp.putfo(io.BytesIO(default_config.encode('utf-8')), '/etc/nginx/sites-available/default')

        # Symlink the default site to sites-enabled so Nginx handles IP-based HTTP requests
        print("\n🔗 Symlinking default server configuration...")
        stdin, stdout, stderr = ssh.exec_command('ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default')
        stdout.channel.recv_exit_status()

        # Test and reload Nginx
        print("\n🔄 Reloading Nginx...")
        stdin, stdout, stderr = ssh.exec_command('nginx -t && systemctl reload nginx')
        exit_status = stdout.channel.recv_exit_status()
        if exit_status == 0:
            print("   ✅ Nginx reloaded successfully!")
        else:
            err_msg = stderr.read().decode('utf-8').strip()
            print(f"   ❌ Nginx test/reload failed: {err_msg}")

        # Final Local Curl check on the VPS
        print("\n📡 Performing final local server test on VPS...")
        stdin, stdout, stderr = ssh.exec_command("curl -i http://127.0.0.1:8082/iclock/cdata?SN=TEST")
        stdout.channel.recv_exit_status()
        print(stdout.read().decode('utf-8'))

        print("\n" + "=" * 60)
        print("🎉 AUTO-FIX COMPLETED! Check if the URL is responding now.")
        print("🌐 Test URL: http://195.35.22.13/iclock/cdata")
        print("=" * 60)

    except Exception as ex:
        print(f"\n❌ Error during execution: {ex}")
    finally:
        sftp.close()
        ssh.close()

if __name__ == "__main__":
    main()
