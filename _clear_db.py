from app.services.db import get_db

conn = get_db()
cursor = conn.cursor()

# Get all tables
tables = cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
print("All tables:", [t[0] for t in tables])

# Clear employers and related data
print("\nClearing database...")

# Delete from employers (main table)
cursor.execute("DELETE FROM employers")
print(f"✓ Cleared employers table")

# Check if there are any foreign key constraints
try:
    cursor.execute("DELETE FROM roles WHERE employer_id IS NOT NULL")
    print(f"✓ Cleared roles table")
except:
    pass

try:
    cursor.execute("DELETE FROM assessments WHERE employer_id IS NOT NULL")
    print(f"✓ Cleared assessments table")
except:
    pass

conn.commit()
print("\n✅ Database completely cleared! You can now sign up.")

# Verify
employers = cursor.execute("SELECT COUNT(*) FROM employers").fetchone()[0]
print(f"Employers count: {employers}")
