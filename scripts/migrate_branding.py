# scripts/migrate_branding.py
"""Database migration for tenant branding system"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "epq.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Creating branding tables...")
    
    # Create company_branding table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS company_branding (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employer_id TEXT NOT NULL UNIQUE,
            
            -- Logo variants (file paths)
            logo_original TEXT,
            logo_transparent TEXT,
            logo_monochrome TEXT,
            logo_favicon TEXT,
            
            -- Active selections
            active_logo_variant TEXT DEFAULT 'transparent',
            
            -- Metadata
            original_filename TEXT,
            mime_type TEXT,
            file_size_bytes INTEGER,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            -- Theme tokens
            accent_color TEXT,
            use_accent_color INTEGER DEFAULT 0,
            
            -- Watermark settings
            show_watermark INTEGER DEFAULT 0,
            watermark_opacity REAL DEFAULT 0.03,
            watermark_position TEXT DEFAULT 'center',
            
            -- Audit trail
            updated_by TEXT,
            updated_at TIMESTAMP
        )
    """)
    
    print("✓ Created company_branding table")
    
    # Create audit log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS branding_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employer_id TEXT NOT NULL,
            action TEXT NOT NULL,
            changed_fields TEXT,
            user_email TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT
        )
    """)
    
    print("✓ Created branding_audit_log table")
    
    # Add indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_branding_employer ON company_branding(employer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_employer ON branding_audit_log(employer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON branding_audit_log(timestamp)")
    
    print("✓ Created indexes")
    
    # Check if employers table needs new columns
    cursor.execute("PRAGMA table_info(employers)")
    columns = {row[1] for row in cursor.fetchall()}
    
    if 'is_admin' not in columns:
        cursor.execute("ALTER TABLE employers ADD COLUMN is_admin INTEGER DEFAULT 1")
        print("✓ Added is_admin column to employers")
    
    if 'company_name' not in columns:
        cursor.execute("ALTER TABLE employers ADD COLUMN company_name TEXT")
        print("✓ Added company_name column to employers")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate()
