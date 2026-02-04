import sqlite3

# Check root epq.db
print("=== Checking epq.db (root) ===")
try:
    conn = sqlite3.connect('epq.db')
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables: {tables}")
    
    if 'applicants' in tables:
        cur.execute("SELECT COUNT(*) FROM applicants")
        count = cur.fetchone()[0]
        print(f"Applicants count: {count}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")

print("\n=== Checking data/epq.db ===")
try:
    conn = sqlite3.connect('data/epq.db')
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables: {tables}")
    
    if 'applicants' in tables:
        cur.execute("SELECT COUNT(*) FROM applicants")
        count = cur.fetchone()[0]
        print(f"Applicants count: {count}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
