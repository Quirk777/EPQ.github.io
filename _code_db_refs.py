import re, pathlib
root = pathlib.Path("app")
pat = re.compile(r"(sqlite3\.connect|app\.db|epq\.db|DB_PATH|DATABASE)", re.I)

for p in root.rglob("*.py"):
    txt = p.read_text(encoding="utf-8", errors="ignore").splitlines()
    for i, line in enumerate(txt, 1):
        if pat.search(line):
            print(f"{p}:{i}: {line}")
