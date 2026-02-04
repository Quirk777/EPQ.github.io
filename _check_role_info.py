import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "epq.db"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get the 3 valid PDFs with their role info
cur.execute("""
    SELECT 
        a.candidate_id,
        a.applicant_name,
        a.pdf_filename,
        s.assessment_id,
        s.role_id,
        s.employer_id
    FROM applicants a
    JOIN assessments s ON s.assessment_id = a.assessment_id
    WHERE a.candidate_id IN ('A-26e4d8377767', 'A-39ce274b-7c2b44', 'A-93525649da2e')
""")

print("Valid PDFs with role information:\n")
for row in cur.fetchall():
    print(f"Candidate: {row['candidate_id']} ({row['applicant_name']})")
    print(f"  Assessment: {row['assessment_id']}")
    print(f"  Role: {row['role_id']}")
    print(f"  Employer: {row['employer_id']}")
    print(f"  PDF: {row['pdf_filename']}")
    print()

conn.close()
