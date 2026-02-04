"""
Test the PDF endpoint directly to see what's happening
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "epq.db"

# Get a valid candidate_id
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute("""
    SELECT candidate_id, pdf_filename 
    FROM applicants 
    WHERE pdf_status='success' AND pdf_filename IS NOT NULL
    LIMIT 1
""")
row = cur.fetchone()
conn.close()

if row:
    candidate_id = row[0]
    pdf_filename = row[1]
    print(f"Testing with candidate: {candidate_id}")
    print(f"Expected PDF: {pdf_filename}")
    print()
    
    # Check if file exists
    pdf_path = Path(__file__).parent / "reports" / pdf_filename
    print(f"PDF file exists: {pdf_path.exists()}")
    print(f"PDF path: {pdf_path}")
    
    if pdf_path.exists():
        print(f"PDF size: {pdf_path.stat().st_size} bytes")
else:
    print("No valid PDFs found in database")
