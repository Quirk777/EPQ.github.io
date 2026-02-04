#!/usr/bin/env python3
"""Fix branding paths in database to use forward slashes"""

import sqlite3
from pathlib import Path

def fix_branding_paths():
    db_path = Path(__file__).parent / "epq.db"
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all branding entries
    cursor.execute("SELECT employer_id, logo_original, logo_transparent, logo_monochrome, logo_favicon FROM company_branding")
    rows = cursor.fetchall()
    
    print(f"Found {len(rows)} branding entries")
    
    for employer_id, original, transparent, monochrome, favicon in rows:
        print(f"\nProcessing employer {employer_id}:")
        
        # Fix each path
        updates = []
        values = []
        
        if original and '\\' in original:
            fixed_original = original.replace('\\', '/')
            updates.append("logo_original = ?")
            values.append(fixed_original)
            print(f"  Fixed original: {original} -> {fixed_original}")
        
        if transparent and '\\' in transparent:
            fixed_transparent = transparent.replace('\\', '/')
            updates.append("logo_transparent = ?")
            values.append(fixed_transparent)
            print(f"  Fixed transparent: {transparent} -> {fixed_transparent}")
        
        if monochrome and '\\' in monochrome:
            fixed_monochrome = monochrome.replace('\\', '/')
            updates.append("logo_monochrome = ?")
            values.append(fixed_monochrome)
            print(f"  Fixed monochrome: {monochrome} -> {fixed_monochrome}")
        
        if favicon and '\\' in favicon:
            fixed_favicon = favicon.replace('\\', '/')
            updates.append("logo_favicon = ?")
            values.append(fixed_favicon)
            print(f"  Fixed favicon: {favicon} -> {fixed_favicon}")
        
        # Update the database if there were changes
        if updates:
            values.append(employer_id)
            query = f"UPDATE company_branding SET {', '.join(updates)} WHERE employer_id = ?"
            cursor.execute(query, values)
            print(f"  Updated database for employer {employer_id}")
        else:
            print(f"  No changes needed for employer {employer_id}")
    
    conn.commit()
    conn.close()
    print("\nDatabase update complete!")

if __name__ == "__main__":
    fix_branding_paths()