import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "epq.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Create applicants table
cur.execute("""
CREATE TABLE IF NOT EXISTS applicants (
    candidate_id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    responses_json TEXT NOT NULL,
    score_json TEXT,
    pdf_status TEXT NOT NULL DEFAULT 'pending',
    pdf_filename TEXT,
    pdf_error TEXT,
    submitted_utc TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id)
)
""")

conn.commit()
conn.close()
print("Applicants table created!")
