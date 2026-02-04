import sqlite3

conn = sqlite3.connect('epq.db')
cur = conn.cursor()

cur.execute('''
    SELECT candidate_id, pdf_status, pdf_filename, pdf_error 
    FROM applicants 
    ORDER BY submitted_utc DESC 
    LIMIT 5
''')

print("Recent applicants:\n")
print(f"{'Candidate ID':<25} {'Status':<12} {'Filename':<40} {'Error'}")
print("-" * 120)

for row in cur.fetchall():
    cid, status, filename, error = row
    print(f"{cid:<25} {status:<12} {filename or 'None':<40} {error or ''}")

conn.close()
