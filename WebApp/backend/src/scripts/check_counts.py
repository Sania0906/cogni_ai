import json
import os
import sys
import urllib.request
from pathlib import Path


def load_env_defaults() -> None:
    """Load backend/.env or WebApp/.env without overriding already-set environment variables."""
    script_path = Path(__file__).resolve()
    candidates = [
        script_path.parents[2] / ".env",  # WebApp/backend/.env
        script_path.parents[3] / ".env",  # WebApp/.env
    ]
    for env_path in candidates:
        if not env_path.is_file():
            continue
        with env_path.open("r", encoding="utf-8") as fh:
            for raw_line in fh:
                line = raw_line.strip()
                if not line or line.startswith("#"):
                    continue
                if line.startswith("export "):
                    line = line[len("export "):].strip()
                if "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip("\"'")
                if k:
                    os.environ.setdefault(k, v)


load_env_defaults()

supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if (
    not supabase_url
    or not service_role_key
    or not supabase_url.startswith(("http://", "https://"))
    or "your-project-id" in supabase_url
):
    print(
        "Configuration error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment or WebApp/backend/.env.",
        file=sys.stderr,
    )
    sys.exit(1)

rest_url = f"{supabase_url}/rest/v1/"
headers = {
    "apikey": service_role_key,
    "Authorization": f"Bearer {service_role_key}",
    "Prefer": "count=exact",
}
tables = ["profiles", "resumes", "skills", "courses", "jobs", "ats_reports", "career_dna", "assessments"]

print(f"{'Table':<20} | {'Count':<10}")
print("-" * 35)
for t in tables:
    try:
        req = urllib.request.Request(f"{rest_url}{t}?select=id", headers=headers)
        with urllib.request.urlopen(req) as resp:
            cr = resp.headers.get("content-range")
            total = cr.split("/")[1] if cr and "/" in cr else "0"
            print(f"{t:<20} | {total:<10}")
    except Exception as e:
        print(f"{t:<20} | Error: {e}")
