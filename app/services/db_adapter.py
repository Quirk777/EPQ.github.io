"""
Database Adapter for SQLite → PostgreSQL Migration
Minimal changes to support both SQLite (dev) and PostgreSQL (production)
"""
import os
import sqlite3
from pathlib import Path

def get_database_connection():
    """
    Get database connection - PostgreSQL if DATABASE_URL is set, otherwise SQLite
    """
    database_url = os.environ.get("DATABASE_URL")
    
    if database_url:
        # PostgreSQL connection for production
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
            conn.autocommit = True
            return conn, "postgresql"
        except ImportError:
            raise RuntimeError("psycopg2 required for PostgreSQL. Install with: pip install psycopg2-binary")
    else:
        # SQLite connection for development (existing code)
        PROJECT_ROOT = Path(__file__).resolve().parents[2]
        DB_PATH = Path(os.getenv("DB_PATH") or (PROJECT_ROOT / "epq.db")).resolve()
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        return conn, "sqlite"

def execute_sql(query, params=None, fetch=None):
    """
    Execute SQL with database-agnostic parameter handling
    """
    conn, db_type = get_database_connection()
    
    try:
        cursor = conn.cursor()
        
        if db_type == "postgresql":
            # PostgreSQL uses %s for all parameter types
            query = query.replace("?", "%s")
        
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if fetch == "one":
            result = cursor.fetchone()
        elif fetch == "all":
            result = cursor.fetchall()
        else:
            result = cursor.rowcount
        
        if db_type == "sqlite":
            conn.commit()
        
        return result
    finally:
        conn.close()