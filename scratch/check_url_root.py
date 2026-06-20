import urllib.request
import sys
import ssl

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://shastikaglobalexport.co.in/"
print(f"Fetching headers for {url}...")
try:
    req = urllib.request.Request(url, method="HEAD")
    with urllib.request.urlopen(req, context=ctx) as resp:
        print("Headers:")
        for k, v in resp.getheaders():
            print(f"  {k}: {v}")
except Exception as e:
    print(f"Error: {e}")
