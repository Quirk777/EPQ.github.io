import sqlite3

conn = sqlite3.connect('epq.db')
cur = conn.cursor()

cur.execute("""
    UPDATE applicants 
    SET pdf_status='failed', 
        pdf_error='Stuck before auto-detection fix. Please resubmit to regenerate PDF.' 
    WHERE pdf_status='processing'
""")

conn.commit()
print(f"Marked {cur.rowcount} stuck PDFs as failed")
conn.close()
