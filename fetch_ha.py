import requests
import json
import sys

URL = "http://192.168.2.101:8123"
USER = "admini"
PASS = "admin.622120"

session = requests.Session()

# 1. Start auth flow
try:
    resp = session.post(f"{URL}/auth/login_flow", json={"client_id": "http://localhost", "handler": ["homeassistant", None]})
    flow = resp.json()
    flow_id = flow["flow_id"]

    # 2. Provide credentials
    resp2 = session.post(f"{URL}/auth/login_flow/{flow_id}", json={"username": USER, "password": PASS, "client_id": "http://localhost"})
    flow2 = resp2.json()
    
    if flow2.get("type") != "create_entry":
        print("Login failed:", flow2)
        sys.exit(1)
        
    auth_code = flow2["result"]

    # 3. Exchange code for token
    token_data = {
        "grant_type": "authorization_code",
        "code": auth_code,
        "client_id": "http://localhost"
    }
    resp3 = session.post(f"{URL}/auth/token", data=token_data)
    tokens = resp3.json()
    access_token = tokens["access_token"]

    # 4. Fetch entities
    headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
    resp4 = session.get(f"{URL}/api/states", headers=headers)
    states = resp4.json()

    print(f"Successfully fetched {len(states)} entities!")
    
    # Filter for common controllable entities (light, switch, climate, cover)
    interesting = [s for s in states if s["entity_id"].startswith(("light.", "switch.", "climate.", "cover."))]
    print("\n--- 可控设备列表 ---")
    for s in interesting:
        name = s.get("attributes", {}).get("friendly_name", "Unknown")
        print(f"ID: {s['entity_id']:<30} | Name: {name}")

except Exception as e:
    print("Error:", e)
