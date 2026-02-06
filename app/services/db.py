import uuid
import datetime
import json
import os
import sqlite3
from pathlib import Path

# Set up database path for SQLite (development)
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.getenv("DB_PATH") or (PROJECT_ROOT / "epq.db")).resolve()

# Database connection with PostgreSQL support for production
def connect():
    """Get database connection - PostgreSQL if DATABASE_URL is set, otherwise SQLite"""
    database_url = os.environ.get("DATABASE_URL")
    
    if database_url:
        # PostgreSQL connection for production
        try:
            import psycopg2
            from psycopg2.extras import RealDictCursor
            conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
            return conn
        except ImportError:
            raise RuntimeError("psycopg2-binary required for PostgreSQL. Install with: pip install psycopg2-binary")
    else:
        # SQLite connection for development (existing code)
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        return conn

def now_iso() -> str:
    """Return current UTC timestamp in ISO format."""
    return datetime.datetime.utcnow().isoformat()

def init_db():
    con = connect()
    try:
        cur = con.cursor()
        
        # Skip SQLite-specific PRAGMA for PostgreSQL
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:  # Only run PRAGMA on SQLite
            cur.execute("PRAGMA journal_mode=WAL;")
        
        # Create employers table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS employers (
            employer_id TEXT PRIMARY KEY,
            company_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email_verified INTEGER DEFAULT 0,
            verification_token TEXT,
            verification_token_expires TEXT,
            reset_token TEXT,
            reset_token_expires TEXT,
            created_utc TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Add new columns to existing employers table (PostgreSQL compatible)
        columns_to_add = [
            ("email_verified", "INTEGER DEFAULT 0"),
            ("verification_token", "TEXT"),
            ("verification_token_expires", "TEXT"),
            ("reset_token", "TEXT"),
            ("reset_token_expires", "TEXT")
        ]
        
        for column_name, column_def in columns_to_add:
            try:
                if database_url:  # PostgreSQL
                    cur.execute(f"ALTER TABLE employers ADD COLUMN IF NOT EXISTS {column_name} {column_def}")
                else:  # SQLite
                    cur.execute(f"ALTER TABLE employers ADD COLUMN {column_name} {column_def}")
            except Exception:
                pass  # Column already exists
        
        # Create assessments table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS assessments (
            assessment_id TEXT PRIMARY KEY,
            employer_id TEXT NOT NULL,
            role_id TEXT NOT NULL,
            environment TEXT NOT NULL,
            max_questions INTEGER DEFAULT 60,
            created_utc TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employer_id) REFERENCES employers(employer_id)
        )
        """)
        
        # Create applicants table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS applicants (
            candidate_id TEXT PRIMARY KEY,
            assessment_id TEXT NOT NULL,
            applicant_name TEXT NOT NULL,
            applicant_email TEXT NOT NULL,
            responses_json TEXT NOT NULL,
            score_json TEXT,
            pdf_status TEXT NOT NULL DEFAULT 'pending',
            pdf_filename TEXT,
            pdf_error TEXT,
            submitted_utc TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assessment_id) REFERENCES assessments(assessment_id)
        )
        """)
        
        # Create candidate tags table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS candidate_tags (
            candidate_id TEXT NOT NULL,
            tag_id TEXT NOT NULL,
            created_utc TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (candidate_id, tag_id),
            FOREIGN KEY (candidate_id) REFERENCES applicants(candidate_id) ON DELETE CASCADE
        )
        """)
        
        # Create candidate notes table
        database_url = os.environ.get("DATABASE_URL")
        note_id_type = "SERIAL PRIMARY KEY" if database_url else "INTEGER PRIMARY KEY AUTOINCREMENT"
        cur.execute(f"""
        CREATE TABLE IF NOT EXISTS candidate_notes (
            note_id {note_id_type},
            candidate_id TEXT NOT NULL,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (candidate_id) REFERENCES applicants(candidate_id) ON DELETE CASCADE
        )
        """)
        
        # Create candidate feedback table
        feedback_id_type = "SERIAL PRIMARY KEY" if database_url else "INTEGER PRIMARY KEY AUTOINCREMENT"
        cur.execute(f"""
        CREATE TABLE IF NOT EXISTS candidate_feedback (
            feedback_id {feedback_id_type},
            candidate_id TEXT NOT NULL,
            category TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (candidate_id) REFERENCES applicants(candidate_id) ON DELETE CASCADE
        )
        """)
        
        # Create webhooks table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS webhooks (
            webhook_id TEXT PRIMARY KEY,
            employer_id TEXT NOT NULL,
            url TEXT NOT NULL,
            event_type TEXT NOT NULL,
            secret TEXT,
            active INTEGER DEFAULT 1,
            created_utc TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (employer_id) REFERENCES employers(employer_id) ON DELETE CASCADE
        )
        """)
        
        # Create webhook_logs table
        log_id_type = "SERIAL PRIMARY KEY" if database_url else "INTEGER PRIMARY KEY AUTOINCREMENT"
        cur.execute(f"""
        CREATE TABLE IF NOT EXISTS webhook_logs (
            log_id {log_id_type},
            webhook_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            status_code INTEGER,
            response_body TEXT,
            error TEXT,
            created_utc TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (webhook_id) REFERENCES webhooks(webhook_id) ON DELETE CASCADE
        )
        """)
        
        con.commit()
    finally:
        con.close()
# -------------------------
# Employer helpers
# -------------------------
def create_employer(company_name: str, email: str) -> str:
    """
    Create a new employer record and return the employer_id.
    Password should be set separately using auth_db.set_employer_password.
    """
    con = connect()
    try:
        cur = con.cursor()
        employer_id = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO employers (employer_id, company_name, email, password_hash, email_verified, subscription_status)
               VALUES (?, ?, ?, '', 0, 'trial')""",
            (employer_id, company_name, email)
        )
        con.commit()
        return employer_id
    finally:
        con.close()

def get_employer(employer_id: str):
    """
    Return employer row as dict (or None).
    Used by auth.require_employer.
    """
    con = connect()
    try:
        cur = con.cursor()
        cur.execute("SELECT * FROM employers WHERE employer_id = ? LIMIT 1", (employer_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        try:
            con.close()
        except Exception:
            pass

# -------------------------
# Assessment / submissions helpers
# -------------------------

def list_assessments_for_employer(employer_id: str):
    """
    Returns assessments for an employer as list[dict].
    Schema (from your roles.py): assessments has employer_id and assessment_id (and role_id, environment, etc).
    """
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            "SELECT * FROM assessments WHERE employer_id=? ORDER BY rowid DESC",
            (employer_id,)
        )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        try:
            con.close()
        except Exception:
            pass

def list_applicants_for_assessment(assessment_id: str):
    """
    Returns applicant submissions for an assessment_id as list[dict].
    applicants schema (from epq.db):
      candidate_id, assessment_id, applicant_name, applicant_email,
      pdf_status, pdf_filename, pdf_error, submitted_utc, ...
    """
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            """
            SELECT
              candidate_id,
              assessment_id,
              applicant_name AS name,
              applicant_email AS email,
              pdf_status AS status,
              pdf_filename,
              pdf_error,
              submitted_utc
            FROM applicants
            WHERE assessment_id=?
            ORDER BY COALESCE(submitted_utc,'') DESC, rowid DESC
            """,
            (assessment_id,)
        )
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    finally:
        try:
            con.close()
        except Exception:
            pass


def get_applicant(candidate_id: str):
    """
    Return applicant row as dict (or None).
    Used by reports routes to serve PDFs.
    """
    con = connect()
    try:
        cur = con.cursor()
        cur.execute("SELECT * FROM applicants WHERE candidate_id = ? LIMIT 1", (candidate_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        try:
            con.close()
        except Exception:
            pass

def get_applicant_responses_json(candidate_id: str):
    """Get just the responses_json field for a candidate."""
    con = connect()
    try:
        cur = con.cursor()
        cur.execute("SELECT responses_json FROM applicants WHERE candidate_id = ? LIMIT 1", (candidate_id,))
        row = cur.fetchone()
        return row["responses_json"] if row else None
    finally:
        try:
            con.close()
        except Exception:
            pass


# -------------------------
# Added helpers (auto-patch)
# -------------------------

def get_assessment(assessment_id: str):
    """
    Return assessment row as dict (or None).
    Used by applicant routes to fetch questions + environment.
    """
    con = connect()
    try:
        cur = con.cursor()
        cur.execute("SELECT * FROM assessments WHERE assessment_id = ? LIMIT 1", (assessment_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        try:
            con.close()
        except Exception:
            pass


# -------------------------
# Added applicant helpers (auto-patch)
# -------------------------

def applicant_exists_for_assessment(assessment_id: str, applicant_email: str) -> bool:
    """
    True if an applicant_email already submitted for this assessment_id.
    Used to prevent duplicate submissions.
    """
    email = (applicant_email or "").strip().lower()
    if not email:
        return False
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            "SELECT 1 FROM applicants WHERE assessment_id = ? AND lower(applicant_email) = ? LIMIT 1",
            (assessment_id, email),
        )
        return cur.fetchone() is not None
    finally:
        try:
            con.close()
        except Exception:
            pass

def create_applicant(
    candidate_id: str,
    assessment_id: str,
    applicant_name: str,
    applicant_email: str,
    responses_json: str,
    score_json: str = "",
    pdf_status: str = "processing",
    pdf_filename: str = "",
    pdf_error: str = "",
    submitted_utc: str = "",
):
    """
    Insert applicant row.
    """
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            """
            INSERT INTO applicants
              (candidate_id, assessment_id, applicant_name, applicant_email,
               responses_json, score_json, pdf_status, pdf_filename, pdf_error, submitted_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                candidate_id,
                assessment_id,
                (applicant_name or "").strip(),
                (applicant_email or "").strip().lower(),
                responses_json or "",
                score_json or "",
                pdf_status or "processing",
                pdf_filename or "",
                pdf_error or "",
                submitted_utc or "",
            ),
        )
        con.commit()
        return True
    finally:
        try:
            con.close()
        except Exception:
            pass

def update_applicant_pdf_status(candidate_id: str, pdf_status: str, pdf_filename: str = ""):
    """
    Update PDF generation status for an applicant.
    """
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            "UPDATE applicants SET pdf_status = ?, pdf_filename = ? WHERE candidate_id = ?",
            (pdf_status, pdf_filename or "", candidate_id),
        )
        con.commit()
        return True
    finally:
        try:
            con.close()
        except Exception:
            pass

def set_applicant_pdf_error(candidate_id: str, pdf_error: str):
    """
    Store error string when PDF generation fails.
    """
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            "UPDATE applicants SET pdf_status = 'failed', pdf_error = ? WHERE candidate_id = ?",
            ((pdf_error or "")[:2000], candidate_id),
        )
        con.commit()
        return True
    finally:
        try:
            con.close()
        except Exception:
            pass

def set_applicant_pdf_success(candidate_id: str, pdf_filename: str):
    """
    Mark PDF generation as successful.
    """
    return update_applicant_pdf_status(candidate_id, "success", pdf_filename)

def set_applicant_pdf_failed(candidate_id: str, error_message: str):
    """
    Mark PDF generation as failed with error message.
    """
    return set_applicant_pdf_error(candidate_id, error_message)


# -------------------------
# Added submission helper (auto-patch)
# -------------------------
def create_applicant_submission(
    assessment_id: str,
    applicant_name: str,
    applicant_email: str,
    # What app/routes/applicant.py sends:
    responses=None,
    score=None,
    # Optional legacy params:
    responses_json: str = "",
    score_json: str = "",
    candidate_id: str = "",
    pdf_status: str = "processing",
    pdf_filename: str = "",
    pdf_error: str = "",
    submitted_utc: str = "",
    **kwargs,
):
    """
    Insert into applicants table.

    Works with your schema:
      applicants(candidate_id, assessment_id, applicant_name, applicant_email,
                 responses_json, score_json, pdf_status, pdf_filename, pdf_error, submitted_utc)

    Accepts either:
      - responses=<dict>, score=<dict>
      - responses_json="<json>", score_json="<json>"
    """
    import datetime, uuid, json

    name = (applicant_name or "").strip()
    email = (applicant_email or "").strip().lower()

    if not assessment_id:
        raise ValueError("assessment_id required")
    if not name:
        raise ValueError("applicant_name required")
    if not email:
        raise ValueError("applicant_email required")

    # Allow alternate keyword names without exploding
    if responses is None:
        responses = kwargs.get("response", None)
    if score is None:
        score = kwargs.get("applicant_result", None)

    # Normalize to JSON strings
    if not responses_json:
        try:
            responses_json = json.dumps(responses or {}, ensure_ascii=False)
        except Exception:
            responses_json = "{}"

    if not score_json:
        try:
            score_json = json.dumps(score or {}, ensure_ascii=False)
        except Exception:
            score_json = "{}"

    if not candidate_id:
        candidate_id = "A-" + uuid.uuid4().hex[:12]

    if not submitted_utc:
        submitted_utc = datetime.datetime.utcnow().isoformat()

    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            """
            INSERT INTO applicants
              (candidate_id, assessment_id, applicant_name, applicant_email,
               responses_json, score_json, pdf_status, pdf_filename, pdf_error, submitted_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                candidate_id,
                assessment_id,
                name,
                email,
                responses_json or "",
                score_json or "",
                pdf_status or "processing",
                pdf_filename or "",
                pdf_error or "",
                submitted_utc,
            ),
        )
        con.commit()
        return {
            "candidate_id": candidate_id,
            "assessment_id": assessment_id,
            "applicant_name": name,
            "applicant_email": email,
            "pdf_status": pdf_status or "processing",
            "submitted_utc": submitted_utc,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass
def create_applicant_submission(
    assessment_id: str,
    applicant_name: str,
    applicant_email: str,
    # New-style (what your applicant route is sending)
    responses=None,
    score=None,
    # Old-style (string JSON)
    responses_json: str = "",
    score_json: str = "",
    candidate_id: str = "",
    pdf_status: str = "processing",
    pdf_filename: str = "",
    pdf_error: str = "",
    submitted_utc: str = "",
    **kwargs,
):
    """
    Insert applicant submission into the applicants table.

    Supports BOTH calling styles:
      - create_applicant_submission(..., responses=<dict>, score=<dict>)
      - create_applicant_submission(..., responses_json="<json>", score_json="<json>")

    Your schema:
      applicants(candidate_id, assessment_id, applicant_name, applicant_email,
                 responses_json, score_json, pdf_status, pdf_filename, pdf_error, submitted_utc)
    """
    import datetime, uuid, json

    name = (applicant_name or "").strip()
    email = (applicant_email or "").strip().lower()

    if not assessment_id:
        raise ValueError("assessment_id required")
    if not name:
        raise ValueError("applicant_name required")
    if not email:
        raise ValueError("applicant_email required")

    # Accept alternate param names if someone calls it differently
    if responses is None and "response" in kwargs:
        responses = kwargs.get("response")
    if score is None and "applicant_result" in kwargs:
        score = kwargs.get("applicant_result")

    # Normalize to JSON strings for DB storage
    if not responses_json:
        try:
            responses_json = json.dumps(responses or {}, ensure_ascii=False)
        except Exception:
            responses_json = "{}"

    if not score_json:
        try:
            score_json = json.dumps(score or {}, ensure_ascii=False)
        except Exception:
            score_json = "{}"

    if not candidate_id:
        candidate_id = "A-" + uuid.uuid4().hex[:12]

    if not submitted_utc:
        submitted_utc = datetime.datetime.utcnow().isoformat()

    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            """
            INSERT INTO applicants
              (candidate_id, assessment_id, applicant_name, applicant_email,
               responses_json, score_json, pdf_status, pdf_filename, pdf_error, submitted_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                candidate_id,
                assessment_id,
                name,
                email,
                responses_json or "",
                score_json or "",
                pdf_status or "processing",
                pdf_filename or "",
                pdf_error or "",
                submitted_utc,
            ),
        )
        con.commit()
        return {
            "candidate_id": candidate_id,
            "assessment_id": assessment_id,
            "applicant_name": name,
            "applicant_email": email,
            "pdf_status": pdf_status or "processing",
            "submitted_utc": submitted_utc,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass

def create_applicant_submission(
    assessment_id: str,
    applicant_name: str,
    applicant_email: str,
    responses_json: str,
    score_json: str = "",
    candidate_id: str = "",
    pdf_status: str = "processing",
    pdf_filename: str = "",
    pdf_error: str = "",
    submitted_utc: str = "",
):
    """
    Insert a submission into the applicants table.
    This matches the schema you have:
      applicants(candidate_id, assessment_id, applicant_name, applicant_email,
                 responses_json, score_json, pdf_status, pdf_filename, pdf_error, submitted_utc)
    """
    import datetime, uuid

    name = (applicant_name or "").strip()
    email = (applicant_email or "").strip().lower()

    if not assessment_id:
        raise ValueError("assessment_id required")
    if not name:
        raise ValueError("applicant_name required")
    if not email:
        raise ValueError("applicant_email required")

    if not candidate_id:
        candidate_id = "A-" + uuid.uuid4().hex[:12]

    if not submitted_utc:
        submitted_utc = datetime.datetime.utcnow().isoformat()

    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            """
            INSERT INTO applicants
              (candidate_id, assessment_id, applicant_name, applicant_email,
               responses_json, score_json, pdf_status, pdf_filename, pdf_error, submitted_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                candidate_id,
                assessment_id,
                name,
                email,
                responses_json or "",
                score_json or "",
                pdf_status or "processing",
                pdf_filename or "",
                pdf_error or "",
                submitted_utc,
            ),
        )
        con.commit()
        return {
            "candidate_id": candidate_id,
            "assessment_id": assessment_id,
            "applicant_name": name,
            "applicant_email": email,
            "pdf_status": pdf_status or "processing",
            "submitted_utc": submitted_utc,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass




# ============================================================
# EPQ_FINAL_OVERRIDE_CREATE_APPLICANT_SUBMISSION
# Last-definition wins in Python modules. This override ensures
# applicant.py can call create_applicant_submission(responses=..., score=...)
# without keyword-arg errors, regardless of earlier definitions.
# ============================================================
def create_applicant_submission(
    assessment_id: str,
    applicant_name: str,
    applicant_email: str,
    responses=None,
    score=None,
    responses_json: str = "",
    score_json: str = "",
    candidate_id: str = "",
    pdf_status: str = "processing",
    pdf_filename: str = "",
    pdf_error: str = "",
    submitted_utc: str = "",
    **kwargs,
):
    import datetime, uuid, json

    name = (applicant_name or "").strip()
    email = (applicant_email or "").strip().lower()

    if not assessment_id:
        raise ValueError("assessment_id required")
    if not name:
        raise ValueError("applicant_name required")
    if not email:
        raise ValueError("applicant_email required")

    # Allow alternate keyword names without exploding
    if responses is None:
        responses = kwargs.get("response", None)
    if score is None:
        score = kwargs.get("applicant_result", None)

    # Normalize objects to JSON strings for DB
    if not responses_json:
        try:
            responses_json = json.dumps(responses or {}, ensure_ascii=False)
        except Exception:
            responses_json = "{}"

    if not score_json:
        try:
            score_json = json.dumps(score or {}, ensure_ascii=False)
        except Exception:
            score_json = "{}"

    if not candidate_id:
        candidate_id = "A-" + uuid.uuid4().hex[:12]

    if not submitted_utc:
        submitted_utc = datetime.datetime.utcnow().isoformat()

    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            """
            INSERT INTO applicants
              (candidate_id, assessment_id, applicant_name, applicant_email,
               responses_json, score_json, pdf_status, pdf_filename, pdf_error, submitted_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                candidate_id,
                assessment_id,
                name,
                email,
                responses_json or "",
                score_json or "",
                pdf_status or "processing",
                pdf_filename or "",
                pdf_error or "",
                submitted_utc,
            ),
        )
        con.commit()
        return {
            "candidate_id": candidate_id,
            "assessment_id": assessment_id,
            "applicant_name": name,
            "applicant_email": email,
            "pdf_status": pdf_status or "processing",
            "submitted_utc": submitted_utc,
        }
    finally:
        try:
            con.close()
        except Exception:
            pass


# ============================================================
# EPQ_FINAL_OVERRIDE_ROLE_HELPERS
# Adds: delete_role_cascade, get_active_assessment_for_role, mark_role_configured
# ============================================================
def get_active_assessment_for_role(employer_id: str, role_id: str):
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            "SELECT assessment_id FROM assessments WHERE employer_id = ? AND role_id = ? AND status = 'active' ORDER BY rowid DESC LIMIT 1",
            (employer_id, role_id),
        )
        row = cur.fetchone()
        return row["assessment_id"] if row else None
    finally:
        try: con.close()
        except Exception: pass

def mark_role_configured(employer_id: str, role_id: str):
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            "UPDATE roles SET status = 'configured' WHERE employer_id = ? AND role_id = ?",
            (employer_id, role_id),
        )
        con.commit()
        return True
    finally:
        try: con.close()
        except Exception: pass

def delete_role_cascade(employer_id: str, role_id: str):
    """
    Deletes a role and associated assessments + applicants + applicant_responses.
    Safe: only deletes rows belonging to this employer_id.
    """
    con = connect()
    try:
        cur = con.cursor()

        # collect assessments for this role
        cur.execute(
            "SELECT assessment_id FROM assessments WHERE employer_id = ? AND role_id = ?",
            (employer_id, role_id),
        )
        aids = [r["assessment_id"] for r in cur.fetchall()]

        if aids:
            qMarks = ",".join(["?"] * len(aids))
            cur.execute(f"DELETE FROM applicants WHERE assessment_id IN ({qMarks})", aids)
            cur.execute(f"DELETE FROM applicant_responses WHERE assessment_id IN ({qMarks})", aids)
            cur.execute(f"DELETE FROM assessments WHERE assessment_id IN ({qMarks})", aids)

        cur.execute("DELETE FROM roles WHERE employer_id = ? AND role_id = ?", (employer_id, role_id))
        con.commit()
        return True
    finally:
        try: con.close()
        except Exception: pass

# -------------------------
# Applicant PDF status helpers
# -------------------------
def set_applicant_pdf_status(candidate_id: str, status: str, pdf_filename: str | None = None, pdf_error: str | None = None):
    """
    Update applicants.pdf_status / pdf_filename / pdf_error for a candidate.
    status should be: 'processing' | 'ready' | 'failed'
    """
    con = connect()
    try:
        cur = con.cursor()
        if pdf_filename is None and pdf_error is None:
            cur.execute(
                "UPDATE applicants SET pdf_status=? WHERE candidate_id=?",
                (status, candidate_id)
            )
        else:
            cur.execute(
                "UPDATE applicants SET pdf_status=?, pdf_filename=COALESCE(?, pdf_filename), pdf_error=COALESCE(?, pdf_error) WHERE candidate_id=?",
                (status, pdf_filename, pdf_error, candidate_id)
            )
        con.commit()
    finally:
        try: con.close()
        except Exception: pass


# -------------------------
# Authentication Helper
# -------------------------
from fastapi import Request, HTTPException

def get_current_user_from_session(request: Request):
    """
    FastAPI dependency for session-based authentication.
    Returns user dict with employer_id/user_id.
    """
    # Try to get employer_id from session
    try:
        if hasattr(request, "session") and request.session.get("employer_id"):
            return {
                "user_id": str(request.session["employer_id"]),
                "employer_id": str(request.session["employer_id"])
            }
    except Exception:
        pass
    
    # Try to get from request.state
    try:
        if hasattr(request, "state") and getattr(request.state, "employer_id", None):
            return {
                "user_id": str(request.state.employer_id),
                "employer_id": str(request.state.employer_id)
            }
    except Exception:
        pass
    
    raise HTTPException(status_code=401, detail="Not authenticated")


def get_db():
    """Get database connection"""
    return connect()
