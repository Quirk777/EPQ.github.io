#!/usr/bin/env python3
import json
import httpx

email = "debugtest1@test.com"
password = "TestPass123"

print("Testing POST /api/employer/login (through frontend proxy)")
print()

payload = json.dumps({"email": email, "password": password})
print(f"Payload: {payload}")
print()

try:
    # Make request to frontend proxy (not directly to backend)
    response = httpx.post(
        "http://localhost:3000/api/employer/login",
        content=payload,
        headers={"content-type": "application/json"},
    )
    
    print(f"Status: {response.status_code}")
    print(f"Headers:")
    for k, v in response.headers.items():
        print(f"  {k}: {v}")
    print()
    print(f"Body: {response.text}")
    print()
    
    if response.status_code == 200:
        print("SUCCESS!")
        data = response.json()
        print(f"Response JSON: {data}")
    else:
        print("FAILED!")
        try:
            data = response.json()
            print(f"Error JSON: {data}")
        except:
            print(f"Response text: {response.text}")
 
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
