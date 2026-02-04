import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "epq.db"
REPORTS_DIR = Path(__file__).parent / "reports"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Fix A-39ce274b-7c2b44: has PDF but status is "processing"
pdf_file = "applicant_report_A-39ce274b-7c2b44.pdf"
if (REPORTS_DIR / pdf_file).exists():
    print(f"Fixing A-39ce274b-7c2b44: setting to success with filename {pdf_file}")
    cur.execute(
        "UPDATE applicants SET pdf_status='success', pdf_filename=? WHERE candidate_id='A-39ce274b-7c2b44'",
        (pdf_file,)
    )

# Fix A-26e4d8377767: has PDF but status is "failed"
pdf_file = "applicant_report_A-26e4d8377767.pdf"
if (REPORTS_DIR / pdf_file).exists():
    print(f"Fixing A-26e4d8377767: setting to success with filename {pdf_file}")
    cur.execute(
        "UPDATE applicants SET pdf_status='success', pdf_filename=?, pdf_error=NULL WHERE candidate_id='A-26e4d8377767'",
        (pdf_file,)
    )

conn.commit()
conn.close()
print("\nDone!")
