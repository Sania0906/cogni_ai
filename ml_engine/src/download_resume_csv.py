import urllib.request
import os

url = "https://raw.githubusercontent.com/nikhil-kumarrr/Resume-Analyzer/main/Resume.csv"
dest = r"C:\Users\DELL\cogni_ai\ml_engine\datasets\raw\Resume.csv"

print(f"Downloading {url} to {dest}...")
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=60) as resp:
    data = resp.read()
    with open(dest, "wb") as f:
        f.write(data)

print(f"Downloaded successfully: {len(data)} bytes ({len(data)/1024/1024:.2f} MB)")

