#!/usr/bin/env python3
import sys
sys.path.insert(0, '/c/Users/tchol/OneDrive/Attachments/python_project')

from app.services import auth_db
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

email = "debugtest1@test.com"
password = "TestPass123"

print(f"Testing login for: {email}")
print()

# Step 1: Get employer by email
emp = auth_db.get_employer_by_email(email)
print(f"Step 1 - get_employer_by_email: {bool(emp)}")
if emp:
    print(f"  employer_id: {emp.get('employer_id')}")
    print(f"  email: {emp.get('email')}")
    print(f"  password_hash exists: {bool(emp.get('password_hash'))}")
    if emp.get('password_hash'):
        print(f"  password_hash: {emp['password_hash'][:20]}...")
else:
    print("  ERROR: Employer not found!")
    sys.exit(1)

print()

# Step 2: Verify password
if not emp or not emp.get("password_hash"):
    print("Step 2 - Verify password: FAILED (no password hash)")
    sys.exit(1)

try:
    is_correct = pwd_context.verify(password, emp["password_hash"])
    print(f"Step 2 - Verify password: {is_correct}")
    if not is_correct:
        print("  ERROR: Password does not match!")
        sys.exit(1)
except Exception as e:
    print(f"Step 2 - Verify password: ERROR - {e}")
    sys.exit(1)

print()
print("SUCCESS: Login logic works correctly!")
