import requests

resp = requests.post("http://192.168.2.101:8123/auth/login_flow", json={"client_id": "http://localhost", "redirect_uri": "http://localhost/", "handler": ["homeassistant", None]})
flow = resp.json()

if "flow_id" in flow:
    resp2 = requests.post("http://192.168.2.101:8123/auth/login_flow/" + flow["flow_id"], json={"username": "hfly2024", "password": "admin.622120", "client_id": "http://localhost"})
    flow2 = resp2.json()
    if flow2.get("type") == "create_entry":
        auth_code = flow2["result"]
        token_data = {"grant_type": "authorization_code", "code": auth_code, "client_id": "http://localhost"}
        resp3 = requests.post("http://192.168.2.101:8123/auth/token", data=token_data)
        tokens = resp3.json()
        access_token = tokens["access_token"]
        
        headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        resp4 = requests.get("http://192.168.2.101:8123/api/states", headers=headers)
        states = resp4.json()
        
        interesting = [s for s in states if s["entity_id"].startswith(("light.", "switch.", "climate.", "cover.", "media_player.", "fan."))]
        print("--- 找到的可控设备列表 ---")
        for s in interesting:
            name = s.get("attributes", {}).get("friendly_name", "Unknown")
            print(f"{s['entity_id']:<35} | {name}")
    else:
        print("Login failed:", flow2)
