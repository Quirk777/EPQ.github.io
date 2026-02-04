import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "epq.db"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get a candidate with a successful PDF
cur.execute("""
    SELECT candidate_id, applicant_name, pdf_status, pdf_filename 
    FROM applicants 
    WHERE pdf_status='success' AND pdf_filename IS NOT NULL
    LIMIT 3
""")

rows = cur.fetchall()

print("Candidates with successful PDFs:")
for r in rows:
    print(f"  {r['candidate_id']}: {r['applicant_name']} - {r['pdf_filename']}")
    
conn.close()
