"""
Small database compatibility layer for local SQLite and production PostgreSQL.

Local development keeps using the existing SQLite database unless DATABASE_URL is
set to a PostgreSQL URL. The wrapper keeps the current sqlite-style `?`
placeholders working so route code does not need a broad rewrite.
"""
from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Iterable

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def database_url() -> str:
    return (os.environ.get("DATABASE_URL") or "").strip()


def is_postgres() -> bool:
    url = database_url()
    return url.startswith("postgres://") or url.startswith("postgresql://")


def sqlite_path() -> Path:
    url = database_url()
    if url.startswith("sqlite:///"):
        return Path(url.replace("sqlite:///", "", 1)).expanduser().resolve()

    raw_path = os.environ.get("DB_PATH") or os.environ.get("SQLITE_PATH") or str(PROJECT_ROOT / "epq.db")
    return Path(raw_path).expanduser().resolve()


def _translate_sql_for_postgres(query: str) -> str:
    """Translate the SQLite SQL patterns used by this app to PostgreSQL."""
    query = query.replace("?", "%s")
    query = re.sub(r"\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b", "SERIAL PRIMARY KEY", query, flags=re.I)
    query = re.sub(r"\bBOOLEAN\b", "INTEGER", query, flags=re.I)
    if re.search(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", query, flags=re.I):
        query = re.sub(r"\bINSERT\s+OR\s+IGNORE\s+INTO\b", "INSERT INTO", query, flags=re.I)
        query = query.rstrip().rstrip(";") + " ON CONFLICT DO NOTHING"
    query = re.sub(r"\bINSERT\s+OR\s+REPLACE\s+INTO\b", "INSERT INTO", query, flags=re.I)
    query = re.sub(r"\browid\b", "ctid", query, flags=re.I)
    return query


class CursorAdapter:
    def __init__(self, cursor: Any, db_type: str):
        self._cursor = cursor
        self.db_type = db_type
        self.lastrowid: int | None = None

    def execute(self, query: str, params: Iterable[Any] | None = None):
        original_query = query
        if self.db_type == "postgresql":
            query = _translate_sql_for_postgres(query)
        self._cursor.execute(query, tuple(params or ()))
        self.lastrowid = getattr(self._cursor, "lastrowid", None)
        if self.db_type == "postgresql" and original_query.lstrip().upper().startswith("INSERT"):
            try:
                self._cursor.execute("SELECT LASTVAL() AS lastrowid")
                row = self._cursor.fetchone()
                self.lastrowid = row["lastrowid"] if row else None
            except Exception:
                self.lastrowid = None
        return self

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    @property
    def rowcount(self) -> int:
        return self._cursor.rowcount

    def close(self) -> None:
        self._cursor.close()


class ConnectionAdapter:
    def __init__(self, connection: Any, db_type: str):
        self._connection = connection
        self.db_type = db_type

    def cursor(self):
        return CursorAdapter(self._connection.cursor(), self.db_type)

    def execute(self, query: str, params: Iterable[Any] | None = None):
        cursor = self.cursor()
        cursor.execute(query, params)
        return cursor

    def commit(self) -> None:
        self._connection.commit()

    def rollback(self) -> None:
        self._connection.rollback()

    def close(self) -> None:
        self._connection.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type:
            self.rollback()
        else:
            self.commit()
        self.close()
        return False


def connect() -> ConnectionAdapter:
    """Return a DB-API-like connection for SQLite or PostgreSQL."""
    if is_postgres():
        try:
            import psycopg2
            from psycopg2.extras import DictCursor
        except ImportError as exc:
            raise RuntimeError("psycopg2-binary is required when DATABASE_URL uses PostgreSQL") from exc

        conn = psycopg2.connect(database_url(), cursor_factory=DictCursor)
        conn.autocommit = True
        return ConnectionAdapter(conn, "postgresql")

    path = sqlite_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return ConnectionAdapter(conn, "sqlite")


def database_label() -> str:
    return "PostgreSQL" if is_postgres() else "SQLite"
