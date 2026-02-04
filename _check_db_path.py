from pathlib import Path
import os
import sys

sys.path.insert(0, str(Path(__file__).parent))

PROJECT_ROOT = Path(__file__).resolve().parents[0]
DB_PATH = Path(os.getenv("DB_PATH") or (PROJECT_ROOT / "epq.db")).resolve()

print(f"PROJECT_ROOT: {PROJECT_ROOT}")
print(f"DB_PATH env var: {os.getenv('DB_PATH')}")
print(f"Computed DB_PATH: {DB_PATH}")
print(f"Exists: {DB_PATH.exists()}")
