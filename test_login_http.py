#!/usr/bin/env python3
import json
import httpx

email = "debugtest1@test.com"
password = "TestPass123"

print(f"Testing POST /auth/login with email: {email}")
print()

payload = json.dumps({"email": email, "password": password})
print(f"Payload: {payload}")
print()

try:
    response = httpx.post(
        "http://127.0.0.1:8001/auth/login",
        content=payload,
        headers={"content-type": "application/json"},
    )
    
    print(f"Status: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
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
