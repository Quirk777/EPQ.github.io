import uuid
import datetime
import json
from pathlib import Path
from app.services import db_adapter

PROJECT_ROOT = Path(__file__).resolve().parents[2]

# SQLite path is still exposed for local health checks and legacy scripts.
DB_PATH = db_adapter.sqlite_path()
if not db_adapter.is_postgres():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def connect():
    """Get a SQLite connection locally or PostgreSQL connection in production."""
    return db_adapter.connect()

def now_iso() -> str:
    """Return current UTC timestamp in ISO format."""
    return datetime.datetime.utcnow().isoformat()

def init_db():
    con = connect()
    try:
        cur = con.cursor()
        if not db_adapter.is_postgres():
            cur.execute("PRAGMA journal_mode=WAL;")
        
        # Create employers table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS employers (
            employer_id TEXT PRIMARY KEY,
            company_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            subscription_status TEXT DEFAULT 'trial',
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
            ("subscription_status", "TEXT DEFAULT 'trial'"),
            ("email_verified", "INTEGER DEFAULT 0"),
            ("verification_token", "TEXT"),
            ("verification_token_expires", "TEXT"),
            ("reset_token", "TEXT"),
            ("reset_token_expires", "TEXT")
        ]
        
        for column_name, column_def in columns_to_add:
            try:
                cur.execute(f"ALTER TABLE employers ADD COLUMN {column_name} {column_def}")
            except Exception:
                try:
                    con.rollback()
                except Exception:
                    pass
                pass  # Column already exists
        
        # Create roles table used by the employer role setup flow.
        cur.execute("""
        CREATE TABLE IF NOT EXISTS roles (
            role_id TEXT PRIMARY KEY,
            employer_id TEXT NOT NULL,
            name TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            FOREIGN KEY (employer_id) REFERENCES employers(employer_id)
        )
        """)

        # Create assessments table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS assessments (
            assessment_id TEXT PRIMARY KEY,
            employer_id TEXT NOT NULL,
            role_id TEXT,
            environment TEXT NOT NULL,
            max_questions INTEGER DEFAULT 60,
            status TEXT NOT NULL DEFAULT 'active',
            pdf_filename TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
        note_id_type = "INTEGER PRIMARY KEY AUTOINCREMENT"
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
        feedback_id_type = "INTEGER PRIMARY KEY AUTOINCREMENT"
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
        log_id_type = "INTEGER PRIMARY KEY AUTOINCREMENT"
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

        # Branding tables support tenant logo uploads and visual settings.
        cur.execute("""
        CREATE TABLE IF NOT EXISTS company_branding (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employer_id TEXT NOT NULL UNIQUE,
            logo_original TEXT,
            logo_transparent TEXT,
            logo_monochrome TEXT,
            logo_favicon TEXT,
            active_logo_variant TEXT DEFAULT 'transparent',
            original_filename TEXT,
            mime_type TEXT,
            file_size_bytes INTEGER,
            upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
            accent_color TEXT,
            use_accent_color INTEGER DEFAULT 0,
            show_watermark INTEGER DEFAULT 0,
            watermark_opacity REAL DEFAULT 0.03,
            watermark_position TEXT DEFAULT 'center',
            updated_by TEXT,
            updated_at TEXT
        )
        """)

        cur.execute("""
        CREATE TABLE IF NOT EXISTS branding_audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employer_id TEXT NOT NULL,
            action TEXT NOT NULL,
            changed_fields TEXT,
            user_email TEXT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT
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
              applicant_name,
              applicant_email,
              applicant_name AS name,
              applicant_email AS email,
              pdf_status,
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


def create_assessment(employer_id: str, environment: str, max_questions: int, role_id: str = "") -> str:
    """Create an assessment row and return its assessment_id."""
    assessment_id = uuid.uuid4().hex
    created = now_iso()
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            """
            INSERT INTO assessments
              (assessment_id, employer_id, environment, max_questions, status, pdf_filename, created_at, created_utc, role_id)
            VALUES (?, ?, ?, ?, 'active', '', ?, ?, ?)
            """,
            (assessment_id, employer_id, environment, int(max_questions or 32), created, created, role_id or ""),
        )
        con.commit()
        return assessment_id
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
    responses: dict,
    candidate_id: str | None = None,
    score: dict | None = None,
):
    """Store an applicant submission without changing scoring/business logic."""
    cid = candidate_id or ("A-" + assessment_id[:8] + "-" + uuid.uuid4().hex[:6])
    create_applicant(
        candidate_id=cid,
        assessment_id=assessment_id,
        applicant_name=applicant_name,
        applicant_email=applicant_email,
        responses_json=json.dumps(responses or {}),
        score_json=json.dumps(score or {}),
        pdf_status="processing",
        submitted_utc=now_iso(),
    )
    return cid


def list_applicant_submissions_for_employer(employer_id: str):
    """List all applicant submissions for one employer across assessments."""
    con = connect()
    try:
        cur = con.cursor()
        cur.execute(
            """
            SELECT
              a.candidate_id,
              a.assessment_id,
              a.applicant_name,
              a.applicant_email,
              a.submitted_utc,
              a.pdf_status,
              a.pdf_filename,
              a.pdf_error,
              s.environment,
              s.max_questions
            FROM applicants a
            JOIN assessments s ON s.assessment_id = a.assessment_id
            WHERE s.employer_id = ?
            ORDER BY COALESCE(a.submitted_utc, '') DESC
            """,
            (employer_id,),
        )
        return [dict(r) for r in cur.fetchall()]
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

def db_health():
    """Health check for the main database"""
    try:
        con = connect()
        cur = con.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        con.close()
        return {"status": "healthy", "database": db_adapter.database_label(), "db_path": str(DB_PATH) if not db_adapter.is_postgres() else ""}
    except Exception as e:
        return {"status": "unhealthy", "database": db_adapter.database_label(), "db_path": str(DB_PATH) if not db_adapter.is_postgres() else "", "error": str(e)}
