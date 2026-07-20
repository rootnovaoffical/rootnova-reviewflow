import subprocess, sys, base64, os, urllib.request, json

with open("/tmp/cc-agent/69022784/project/.env") as f:
    for line in f:
        if line.startswith("VITE_SUPABASE_URL="):
            supabase_url = line.split("=", 1)[1].strip()
        elif line.startswith("VITE_SUPABASE_ANON_KEY="):
            anon_key = line.split("=", 1)[1].strip()

api_url = f"{supabase_url}/rest/v1/source_backups?order=created_at.desc&limit=1&select=content_base64"
req = urllib.request.Request(api_url, headers={
    "apikey": anon_key,
    "Authorization": f"Bearer {anon_key}",
})

resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
if not data:
    print("No backup found")
    sys.exit(1)

b64_content = data[0]["content_base64"]
raw = base64.b64decode(b64_content)

out_path = "/tmp/cc-agent/69022784/project/rootnova-source-backup.tar.gz"
with open(out_path, "wb") as f:
    f.write(raw)

print(f"Recovered {len(raw)} bytes to {out_path}")
