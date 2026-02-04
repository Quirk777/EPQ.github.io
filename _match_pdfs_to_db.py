import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "epq.db"
REPORTS_DIR = Path(__file__).parent / "reports"

# Get PDFs that exist on disk
pdf_files = list(REPORTS_DIR.glob("*.pdf"))
print(f"Found {len(pdf_files)} PDF files on disk\n")

# Check database for these files
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

for pdf_file in pdf_files[:10]:  # Check first 10
    filename = pdf_file.name
    
    # Try to extract candidate_id from filename (format: applicant_report_A-xxxxx.pdf)
    if filename.startswith("applicant_report_") and filename.endswith(".pdf"):
        candidate_id = filename.replace("applicant_report_", "").replace(".pdf", "")
        
        cur.execute("""
            SELECT candidate_id, applicant_name, pdf_status, pdf_filename 
            FROM applicants 
            WHERE candidate_id = ?
        """, (candidate_id,))
        
        row = cur.fetchone()
        if row:
            print(f"✓ {candidate_id}:")
            print(f"  Name: {row['applicant_name']}")
            print(f"  DB Status: {row['pdf_status']}")
            print(f"  DB Filename: {row['pdf_filename']}")
            print(f"  Disk File: {filename}")
            print()
        else:
            print(f"✗ {candidate_id}: File exists but NOT IN DATABASE")
            print(f"  Disk File: {filename}")
            print()

conn.close()
