import sqlite3, os

candidates = ["epq.db","app.db","database.db","db.sqlite","db.sqlite3","sqlite.db","epq.sqlite"]
db = None
for cand in candidates:
    if os.path.exists(cand):
        db = cand
        break

print("Using DB:", db if db else "(none found)")
if not db:
    raise SystemExit(1)

conn = sqlite3.connect(db)
cur = conn.cursor()

tables = cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()
print("Tables:", [t[0] for t in tables])

for (name,) in tables:
    low = name.lower()
    if any(k in low for k in ["applicant","submission","response","candidate"]):
        cols = cur.execute("PRAGMA table_info(%s)" % name).fetchall()
        print("\n" + name)
        for c in cols:
            # c = (cid, name, type, notnull, dflt_value, pk)
            print(" ", c[1], c[2])

conn.close()
