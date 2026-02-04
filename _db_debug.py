import os, sqlite3, glob

# 1) Try common DB locations
cands = [
  "data/app.db","data/epq.db","app.db","epq.db","data/database.db",
  "data/*.db","*.db"
]
paths = []
for c in cands:
  paths += glob.glob(c)

paths = [p for p in paths if os.path.exists(p)]
paths = sorted(set(paths), key=lambda p: (os.path.getsize(p), p), reverse=True)

if not paths:
  print("NO_DB_FOUND")
  raise SystemExit(1)

print("DB_CANDIDATES:")
for p in paths[:10]:
  print(" -", p, "size=", os.path.getsize(p))

db = paths[0]
print("\nUSING_DB:", db)

con = sqlite3.connect(db)
cur = con.cursor()

tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("\nTABLES:", tables)

def pragma_cols(t):
  try:
    return [r[1] for r in cur.execute(f"PRAGMA table_info({t})").fetchall()]
  except Exception as e:
    return ["<error>", str(e)]

if "assessments" in tables:
  print("\nASSESSMENTS_COLUMNS:", pragma_cols("assessments"))

  # Show 10 newest rows by rowid (works even if no timestamp columns)
  try:
    rows = cur.execute("SELECT rowid, * FROM assessments ORDER BY rowid DESC LIMIT 10").fetchall()
    print("\nLATEST_ASSESSMENTS (rowid, assessment_id, environment, max_questions):")
    # Find column indexes safely
    cols = [d[0] for d in cur.description]
    def idx(name):
      return cols.index(name) if name in cols else None
    i_aid = idx("assessment_id")
    i_env = idx("environment")
    i_mq  = idx("max_questions")
    for r in rows:
      rid = r[0]
      aid = r[i_aid] if i_aid is not None else None
      env = r[i_env] if i_env is not None else None
      mq  = r[i_mq]  if i_mq  is not None else None
      print(f" - rowid={rid} assessment_id={aid} environment={env} max_questions={mq}")
  except Exception as e:
    print("FAILED_TO_LIST_ASSESSMENTS:", e)
else:
  print("\nNo 'assessments' table found.")
con.close()
