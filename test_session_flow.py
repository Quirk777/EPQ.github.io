#!/usr/bin/env python3
import json
import httpx

email = "debugtest1@test.com"
password = "TestPass123"

print("=" * 60)
print("Step 1: Login and capture session cookie")
print("=" * 60)

payload = json.dumps({"email": email, "password": password})

# Use httpx Client to maintain cookies across requests
client = httpx.Client()

response = client.post(
    "http://localhost:3000/api/employer/login",
    content=payload,
    headers={"content-type": "application/json"},
)

print(f"Login Status: {response.status_code}")
print(f"Response: {response.json()}")
print()

# Check if cookies were received
print("Cookies received:")
for cookie_name, cookie_obj in client.cookies.items():
    print(f"  {cookie_name}: {str(cookie_obj)[:50]}...")
print()

print("=" * 60)
print("Step 2: Call /employer/me with the session cookie")
print("=" * 60)

# This should work if the cookie is being used
response = client.get("http://localhost:3000/api/employer/me")

print(f"Status: {response.status_code}")
print(f"Body: {response.text[:200]}")
print()

if response.status_code == 200:
    print("SUCCESS: Authenticated request worked!")
    try:
        data = response.json()
        print(f"Data: {data}")
    except:
        pass
else:
    print("FAILED: Session cookie not working")
    
client.close()
