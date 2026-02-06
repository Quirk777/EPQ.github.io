#!/usr/bin/env python3
"""
Initialize database tables for production deployment.
Run this once when setting up the database on Railway with PostgreSQL.
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services import db

def main():
    print("🔧 Initializing database tables...")
    
    try:
        # Check if DATABASE_URL is configured
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            print("⚠️  Warning: DATABASE_URL not set. Using SQLite for development.")
        else:
            print(f"✅ Using PostgreSQL database")
        
        # Initialize all tables
        db.init_db()
        print("✅ Database initialization completed successfully!")
        
        # Test connection
        print("\n🧪 Testing database connection...")
        con = db.connect()
        cur = con.cursor()
        
        if database_url:
            cur.execute("SELECT version()")
            result = cur.fetchone()
            print(f"✅ PostgreSQL connection successful: {result[0]}")
        else:
            cur.execute("SELECT sqlite_version()")
            result = cur.fetchone()
            print(f"✅ SQLite connection successful: {result[0]}")
            
        con.close()
        
        print("\n🎉 Database is ready for production!")
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()