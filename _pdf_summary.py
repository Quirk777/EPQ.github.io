import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "epq.db"
REPORTS_DIR = Path(__file__).parent / "reports"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("\n=== PDF Status Summary ===\n")
cur.execute("""
    SELECT candidate_id, applicant_name, applicant_email, pdf_status, pdf_filename, pdf_error 
    FROM applicants 
    ORDER BY submitted_utc DESC
    LIMIT 10
""")

for row in cur.fetchall():
    cid = row['candidate_id']
    name = row['applicant_name']
    status = row['pdf_status']
    filename = row['pdf_filename']
    
    print(f"Candidate: {cid} ({name})")
    print(f"  Status: {status}")
    print(f"  Filename: {filename or 'None'}")
    
    if filename:
        pdf_path = REPORTS_DIR / filename
        print(f"  File exists: {pdf_path.exists()}")
    
    print()

conn.close()
