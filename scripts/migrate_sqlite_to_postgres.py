"""
Copy EPQ data from the local SQLite database into the production PostgreSQL DB.

Run after the PostgreSQL service is healthy and before opening the app to users:
    python scripts/migrate_sqlite_to_postgres.py --sqlite epq.db

The script creates the production schema through app.services.db.init_db(), then
copies rows for tables that exist in both databases. It does not delete data from
PostgreSQL unless --truncate is passed.
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


CORE_TABLES = [
    "employers",
    "roles",
    "assessments",
    "applicants",
    "candidate_tags",
    "candidate_notes",
    "candidate_feedback",
    "webhooks",
    "webhook_logs",
    "company_branding",
    "branding_audit_log",
    "email_subscriptions",
]


def sqlite_tables(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    return {row[0] for row in rows if not row[0].startswith("sqlite_")}


def sqlite_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def postgres_columns(conn, table: str) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
            """,
            (table,),
        )
        return [row["column_name"] for row in cur.fetchall()]


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate EPQ SQLite data to PostgreSQL")
    parser.add_argument("--sqlite", default=str(PROJECT_ROOT / "epq.db"), help="Path to the source SQLite DB")
    parser.add_argument("--truncate", action="store_true", help="Delete target table rows before copying")
    args = parser.parse_args()

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url.startswith(("postgres://", "postgresql://")):
        raise SystemExit("Set DATABASE_URL to the target PostgreSQL connection string before running.")

    sqlite_path = Path(args.sqlite).expanduser().resolve()
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite database not found: {sqlite_path}")

    from app.services import db, db_adapter

    db.init_db()
    sqlite_conn = sqlite3.connect(str(sqlite_path))
    sqlite_conn.row_factory = sqlite3.Row
    pg_conn = db_adapter.connect()

    try:
        available = sqlite_tables(sqlite_conn)
        for table in CORE_TABLES:
            if table not in available:
                print(f"skip {table}: not present in SQLite")
                continue

            source_cols = sqlite_columns(sqlite_conn, table)
            target_cols = postgres_columns(pg_conn._connection, table)
            cols = [col for col in source_cols if col in target_cols]
            if not cols:
                print(f"skip {table}: no shared columns")
                continue

            rows = sqlite_conn.execute(f"SELECT {', '.join(cols)} FROM {table}").fetchall()
            if not rows:
                print(f"skip {table}: no rows")
                continue

            cur = pg_conn.cursor()
            if args.truncate:
                cur.execute(f"DELETE FROM {table}")

            placeholders = ", ".join(["?"] * len(cols))
            col_sql = ", ".join(cols)
            insert_sql = f"INSERT INTO {table} ({col_sql}) VALUES ({placeholders})"
            inserted = 0
            for row in rows:
                try:
                    cur.execute(insert_sql, [row[col] for col in cols])
                    inserted += 1
                except Exception as exc:
                    pg_conn.rollback()
                    print(f"warning {table}: skipped one row ({exc})")
                    cur = pg_conn.cursor()
            pg_conn.commit()
            print(f"copied {inserted} rows into {table}")
    finally:
        sqlite_conn.close()
        pg_conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
