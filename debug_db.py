#!/usr/bin/env python3
"""
SQLite Debug Helper for Development
Inspect and manage test users in epq.db during local development.
"""
import os
import sys
import sqlite3
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "epq.db"

def connect_db():
    if not DB_PATH.exists():
        print(f"❌ Database not found: {DB_PATH}")
        sys.exit(1)
    return sqlite3.connect(str(DB_PATH))

def list_employers():
    """List all employers in the database"""
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT employer_id, company_name, email, email_verified, created_utc 
        FROM employers 
        ORDER BY created_utc DESC
    """)
    
    employers = cursor.fetchall()
    conn.close()
    
    if not employers:
        print("📭 No employers found in database.")
        return
    
    print(f"👥 Found {len(employers)} employer(s):")
    print("-" * 80)
    for emp in employers:
        employer_id, company_name, email, email_verified, created_utc = emp
        verified_status = "✅ Verified" if email_verified else "❌ Not verified"
        print(f"ID: {employer_id}")
        print(f"Company: {company_name}")
        print(f"Email: {email}")
        print(f"Status: {verified_status}")
        print(f"Created: {created_utc}")
        print("-" * 80)

def delete_employer_by_email(email):
    """Delete an employer by email address"""
    conn = connect_db()
    cursor = conn.cursor()
    
    # First check if employer exists
    cursor.execute("SELECT employer_id, company_name FROM employers WHERE lower(email) = lower(?)", (email,))
    employer = cursor.fetchone()
    
    if not employer:
        print(f"❌ No employer found with email: {email}")
        conn.close()
        return
    
    employer_id, company_name = employer
    
    # Delete the employer
    cursor.execute("DELETE FROM employers WHERE employer_id = ?", (employer_id,))
    affected_rows = cursor.rowcount
    
    conn.commit()
    conn.close()
    
    if affected_rows > 0:
        print(f"✅ Deleted employer: {company_name} ({email})")
    else:
        print(f"❌ Failed to delete employer: {email}")

def clear_all_employers():
    """Clear all employers (FOR DEVELOPMENT ONLY)"""
    response = input("⚠️  This will delete ALL employers. Type 'YES' to confirm: ")
    if response != "YES":
        print("❌ Operation cancelled.")
        return
    
    conn = connect_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM employers")
    count = cursor.fetchone()[0]
    
    cursor.execute("DELETE FROM employers")
    conn.commit()
    conn.close()
    
    print(f"✅ Deleted {count} employer(s) from database.")

def main():
    if len(sys.argv) < 2:
        print("📚 SQLite Debug Helper for Development")
        print()
        print("Usage:")
        print(f"  {sys.argv[0]} list                    # List all employers")
        print(f"  {sys.argv[0]} delete <email>          # Delete employer by email")
        print(f"  {sys.argv[0]} clear                   # Clear all employers")
        print()
        print("Examples:")
        print(f"  {sys.argv[0]} list")
        print(f"  {sys.argv[0]} delete test@example.com")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_employers()
    elif command == "delete" and len(sys.argv) == 3:
        delete_employer_by_email(sys.argv[2])
    elif command == "clear":
        clear_all_employers()
    else:
        print("❌ Invalid command. Use 'list', 'delete <email>', or 'clear'")
        sys.exit(1)

if __name__ == "__main__":
    main()