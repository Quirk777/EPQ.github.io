import os
import sqlite3
import secrets
from datetime import datetime

DB_PATH = os.getenv("DB_PATH") or os.path.join(os.path.dirname(__file__), "..", "epq.db")

def _conn():
    return sqlite3.connect(DB_PATH)

def ensure_table():
    with _conn() as con:
        con.execute("""
        CREATE TABLE IF NOT EXISTS email_subscriptions (
          email TEXT PRIMARY KEY,
          is_subscribed INTEGER NOT NULL DEFAULT 1,
          unsubscribe_token TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          last_sent_at TEXT
        )
        """)
        con.commit()

def upsert_subscription(email: str) -> str:
    ensure_table()
    now = datetime.utcnow().isoformat()

    with _conn() as con:
        row = con.execute("SELECT unsubscribe_token FROM email_subscriptions WHERE email = ?", (email,)).fetchone()
        if row:
            return row[0]
        token = secrets.token_urlsafe(32)
        con.execute("""
          INSERT INTO email_subscriptions (email, is_subscribed, unsubscribe_token, created_at, updated_at)
          VALUES (?, 1, ?, ?, ?)
        """, (email, token, now, now))
        con.commit()
        return token

def set_subscribed_by_token(token: str, subscribed: bool) -> bool:
    ensure_table()
    now = datetime.utcnow().isoformat()
    with _conn() as con:
        cur = con.execute("""
          UPDATE email_subscriptions
          SET is_subscribed = ?, updated_at = ?
          WHERE unsubscribe_token = ?
        """, (1 if subscribed else 0, now, token))
        con.commit()
        return cur.rowcount > 0

def get_email_by_token(token: str) -> str | None:
    ensure_table()
    with _conn() as con:
        row = con.execute("SELECT email FROM email_subscriptions WHERE unsubscribe_token = ?", (token,)).fetchone()
        return row[0] if row else None
