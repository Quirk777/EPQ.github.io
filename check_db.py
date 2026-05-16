#!/usr/bin/env python3
import sqlite3

conn = sqlite3.connect('epq.db')
cur = conn.cursor()

# Check the debugtest1 account
cur.execute('SELECT employer_id, email, password_hash FROM employers WHERE email = ?', ('debugtest1@test.com',))
row = cur.fetchone()

if row:
    employer_id, email, password_hash = row
    print(f"employer_id: {employer_id}")
    print(f"email: {email}")
    print(f"password_hash set: {bool(password_hash)}")
    print(f"password_hash length: {len(password_hash) if password_hash else 0}")
    if password_hash:
        print(f"password_hash prefix: {password_hash[:20]}...")
else:
    print("No employer found with email debugtest1@test.com")

conn.close()
