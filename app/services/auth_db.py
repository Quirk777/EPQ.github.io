import os
import sqlite3
import secrets
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

# Single source of truth for sqlite DB path:
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.getenv("DB_PATH") or (PROJECT_ROOT / "epq.db")).resolve()

def connect():
    con = sqlite3.connect(str(DB_PATH))
    con.row_factory = sqlite3.Row
    return con

def _conn():
    """Alias for connect() for backwards compatibility"""
    return connect()

def ensure_auth_columns():
    """Ensure all auth-related columns exist in the employers table"""
    con = _conn()
    cur = con.cursor()
    
    columns_to_add = [
        ("password_hash", "TEXT"),
        ("email_verified", "INTEGER DEFAULT 0"),
        ("verification_token", "TEXT"),
        ("verification_token_expires", "TEXT"),
        ("reset_token", "TEXT"),
        ("reset_token_expires", "TEXT"),
    ]
    
    for column_name, column_type in columns_to_add:
        try:
            cur.execute(f"ALTER TABLE employers ADD COLUMN {column_name} {column_type}")
            con.commit()
        except sqlite3.OperationalError:
            pass  # Column already exists
    
    con.close()

def get_employer_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get employer record by email address"""
    ensure_auth_columns()
    con = _conn()
    cur = con.cursor()
    cur.execute(
        """SELECT employer_id, company_name, email, subscription_status, password_hash, 
           email_verified, verification_token, verification_token_expires,
           reset_token, reset_token_expires
           FROM employers WHERE lower(email)=lower(?)""",
        (email,)
    )
    row = cur.fetchone()
    con.close()
    return dict(row) if row else None

def set_employer_password(employer_id: str, password_hash: str) -> None:
    """Set the password hash for an employer"""
    ensure_auth_columns()
    con = _conn()
    cur = con.cursor()
    cur.execute("UPDATE employers SET password_hash=? WHERE employer_id=?", (password_hash, employer_id))
    con.commit()
    con.close()

def generate_verification_token(employer_id: str) -> str:
    """Generate and store email verification token for an employer"""
    ensure_auth_columns()
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    
    con = _conn()
    cur = con.cursor()
    cur.execute(
        "UPDATE employers SET verification_token=?, verification_token_expires=? WHERE employer_id=?",
        (token, expires, employer_id)
    )
    con.commit()
    con.close()
    return token

def verify_email_token(token: str) -> Optional[str]:
    """Verify email token and return employer_id if valid"""
    ensure_auth_columns()
    con = _conn()
    cur = con.cursor()
    cur.execute(
        """SELECT employer_id, verification_token_expires 
           FROM employers WHERE verification_token=?""",
        (token,)
    )
    row = cur.fetchone()
    
    if not row:
        con.close()
        return None
    
    employer_id = row["employer_id"]
    expires = row["verification_token_expires"]
    
    # Check if token expired
    if expires and datetime.fromisoformat(expires) < datetime.utcnow():
        con.close()
        return None
    
    # Mark email as verified and clear token
    cur.execute(
        """UPDATE employers 
           SET email_verified=1, verification_token=NULL, verification_token_expires=NULL 
           WHERE employer_id=?""",
        (employer_id,)
    )
    con.commit()
    con.close()
    return employer_id

def generate_reset_token(email: str) -> Optional[str]:
    """Generate and store password reset token for an employer"""
    ensure_auth_columns()
    employer = get_employer_by_email(email)
    if not employer:
        return None
    
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    
    con = _conn()
    cur = con.cursor()
    cur.execute(
        "UPDATE employers SET reset_token=?, reset_token_expires=? WHERE employer_id=?",
        (token, expires, employer["employer_id"])
    )
    con.commit()
    con.close()
    return token

def verify_reset_token(token: str) -> Optional[str]:
    """Verify reset token and return employer_id if valid (does not clear token)"""
    ensure_auth_columns()
    con = _conn()
    cur = con.cursor()
    cur.execute(
        """SELECT employer_id, reset_token_expires 
           FROM employers WHERE reset_token=?""",
        (token,)
    )
    row = cur.fetchone()
    con.close()
    
    if not row:
        return None
    
    employer_id = row["employer_id"]
    expires = row["reset_token_expires"]
    
    # Check if token expired
    if expires and datetime.fromisoformat(expires) < datetime.utcnow():
        return None
    
    return employer_id

def reset_password_with_token(token: str, new_password_hash: str) -> bool:
    """Reset password using valid token and clear the token"""
    employer_id = verify_reset_token(token)
    if not employer_id:
        return False
    
    con = _conn()
    cur = con.cursor()
    cur.execute(
        """UPDATE employers 
           SET password_hash=?, reset_token=NULL, reset_token_expires=NULL 
           WHERE employer_id=?""",
        (new_password_hash, employer_id)
    )
    con.commit()
    con.close()
    return True