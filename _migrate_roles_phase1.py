import sqlite3, os, datetime

DB_PATH = r"C:\Users\tchol\OneDrive\Attachments\python_project\epq.db"

def now():
    return datetime.datetime.utcnow().isoformat()

con = sqlite3.connect(DB_PATH)
cur = con.cursor()

# 1) roles table
cur.execute("""
CREATE TABLE IF NOT EXISTS roles (
  role_id TEXT PRIMARY KEY,
  employer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL
)
""")

# 2) add assessments.role_id if assessments table exists and column missing
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='assessments'")
has_assessments = cur.fetchone() is not None

if not has_assessments:
    print("WARN: assessments table not found; skipping role_id column add.")
else:
    cur.execute("PRAGMA table_info(assessments)")
    cols = [r[1] for r in cur.fetchall()]
    if "role_id" not in cols:
        cur.execute("ALTER TABLE assessments ADD COLUMN role_id TEXT")
        print("OK: Added assessments.role_id")
    else:
        print("OK: assessments.role_id already exists")

con.commit()

# 3) quick print tables + columns for sanity
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cur.fetchall()]
print("Tables:", tables)

if has_assessments:
    cur.execute("PRAGMA table_info(assessments)")
    acols = [r[1] for r in cur.fetchall()]
    print("assessments columns:", acols)

cur.execute("PRAGMA table_info(roles)")
rcols = [r[1] for r in cur.fetchall()]
print("roles columns:", rcols)

con.close()
print("DONE")