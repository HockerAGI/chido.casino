import json
import os
import urllib.request
import urllib.error

url = os.getenv("CHIDO_STATUS_URL", "http://127.0.0.1:3000/api/system/status?emit_event=1")

try:
    with urllib.request.urlopen(url, timeout=60) as res:
        raw = res.read().decode("utf-8", errors="replace")
        data = json.loads(raw)
except urllib.error.HTTPError as e:
    print(e.read().decode("utf-8", errors="replace"))
    raise

print(json.dumps({
    "ok": data.get("ok"),
    "service": data.get("service"),
    "project_id": data.get("project_id"),
    "node_id": data.get("node_id"),
    "status": data.get("status"),
    "checks": data.get("checks"),
}, indent=2, ensure_ascii=False))
