#!/usr/bin/env python3
"""Check and fix stuck PDFs"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "epq.db"
REPORTS_DIR = Path(__file__).parent / "reports"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("\n=== Checking all applicants ===")
cur.execute("SELECT candidate_id, pdf_status, pdf_filename FROM applicants")
apps = cur.fetchall()

for row in apps:
    cid = row['candidate_id']
    status = row['pdf_status']
    filename = row['pdf_filename']
    
    print(f"\n{cid}:")
    print(f"  Status: {status}")
    print(f"  Filename: {filename}")
    
    # Check if PDF file actually exists
    if filename:
        pdf_path = REPORTS_DIR / filename
        exists = pdf_path.exists()
        print(f"  File exists: {exists}")
        
        # If file exists but status isn't success, fix it
        if exists and status != "success":
            print(f"  -> FIXING: Setting status to 'success'")
            cur.execute(
                "UPDATE applicants SET pdf_status = 'success' WHERE candidate_id = ?",
                (cid,)
            )
            conn.commit()
    else:
        # No filename in DB, check if file exists anyway
        expected_filename = f"applicant_report_{cid}.pdf"
        pdf_path = REPORTS_DIR / expected_filename
        if pdf_path.exists():
            print(f"  File exists but not tracked: {expected_filename}")
            print(f"  -> FIXING: Updating database with filename")
            cur.execute(
                "UPDATE applicants SET pdf_status = 'success', pdf_filename = ? WHERE candidate_id = ?",
                (expected_filename, cid)
            )
            conn.commit()

conn.close()
print("\n=== Done ===")
