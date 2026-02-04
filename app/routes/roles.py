from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import sqlite3, uuid, datetime
from pathlib import Path

# project root / epq.db
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = (PROJECT_ROOT / "epq.db").resolve()

router = APIRouter(prefix="/api/employer/roles", tags=["roles"])

def now_iso() -> str:
    return datetime.datetime.utcnow().isoformat()

def conn():
    con = sqlite3.connect(str(DB_PATH))
    con.row_factory = sqlite3.Row
    return con

def get_employer_id(request: Request) -> str:
    # session auth (your app uses this pattern)
    try:
        if hasattr(request, "session") and request.session.get("employer_id"):
            return str(request.session["employer_id"])
    except Exception:
        pass
    try:
        if hasattr(request, "state") and getattr(request.state, "employer_id", None):
            return str(request.state.employer_id)
    except Exception:
        pass
    raise HTTPException(status_code=401, detail="Not authenticated")

class RoleCreate(BaseModel):
    name: str

class RoleAssessmentCreate(BaseModel):
    environment: str | None = "moderate"
    max_questions: int | None = 20

@router.get("")
def list_roles(request: Request):
    employer_id = get_employer_id(request)
    with conn() as con:
        cur = con.cursor()
        # include active assessment_id so UI can show link + configured status
        cur.execute(
            """
            SELECT r.role_id,
                   r.name,
                   r.status,
                   r.created_at,
                   s.assessment_id AS assessment_id
            FROM roles r
            LEFT JOIN assessments s
              ON s.role_id = r.role_id
             AND s.employer_id = r.employer_id
             AND s.status = 'active'
            WHERE r.employer_id = ?
            ORDER BY r.rowid DESC
            """,
            (employer_id,)
        )
        rows = cur.fetchall()

    out = []
    for r in rows:
        d = dict(r)
        d["configured"] = True if d.get("assessment_id") else False
        out.append(d)
    return out

@router.post("")
def create_role(payload: RoleCreate, request: Request):
    employer_id = get_employer_id(request)
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")

    role_id = "R-" + uuid.uuid4().hex[:12]
    with conn() as con:
        cur = con.cursor()
        # Make sure roles table supports these columns: role_id, employer_id, name, status, created_at
        cur.execute(
            "INSERT INTO roles (role_id, employer_id, name, status, created_at) VALUES (?, ?, ?, 'active', ?)",
            (role_id, employer_id, name, now_iso())
        )
        con.commit()

    return {"role_id": role_id, "name": name, "status": "active"}

@router.post("/{role_id}/assessment")
def create_or_update_role_assessment(role_id: str, payload: RoleAssessmentCreate, request: Request):
    employer_id = get_employer_id(request)
    environment = (payload.environment or "moderate").strip() or "moderate"
    max_questions = int(payload.max_questions or 20)

    assessment_id = uuid.uuid4().hex

    with conn() as con:
        cur = con.cursor()

        # ensure role belongs to employer
        cur.execute("SELECT role_id FROM roles WHERE role_id=? AND employer_id=?", (role_id, employer_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Role not found")

        # deactivate prior active assessment for this role
        cur.execute(
            "UPDATE assessments SET status='inactive' WHERE employer_id=? AND role_id=? AND status='active'",
            (employer_id, role_id)
        )

        # insert new active assessment
        # NOTE: assessments table in your project previously included: assessment_id, employer_id, environment, max_questions, status, pdf_filename, created_at, created_utc, role_id
        cur.execute(
            """
            INSERT INTO assessments
              (assessment_id, employer_id, environment, max_questions, status, pdf_filename, created_at, created_utc, role_id)
            VALUES (?, ?, ?, ?, 'active', '', ?, ?, ?)
            """,
            (assessment_id, employer_id, environment, max_questions, now_iso(), now_iso(), role_id)
        )

        # mark role configured (status column)
        cur.execute(
            "UPDATE roles SET status='configured' WHERE employer_id=? AND role_id=?",
            (employer_id, role_id)
        )

        con.commit()

    return {"role_id": role_id, "assessment_id": assessment_id, "environment": environment, "max_questions": max_questions}

@router.get("/{role_id}/submissions")
def role_submissions(role_id: str, request: Request):
    employer_id = get_employer_id(request)

    with conn() as con:
        cur = con.cursor()

        # ensure role belongs to employer
        cur.execute("SELECT role_id FROM roles WHERE role_id=? AND employer_id=?", (role_id, employer_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Role not found")

        # Your SQLite schema (from your introspection):
        # applicants: candidate_id, assessment_id, applicant_name, applicant_email, responses_json, score_json,
        #             pdf_status, pdf_filename, pdf_error, submitted_utc
        q = """
          SELECT
            a.candidate_id AS candidate_id,
            a.applicant_name AS applicant_name,
            a.applicant_email AS applicant_email,
            a.submitted_utc AS submitted_utc,
            a.pdf_status AS pdf_status,
            a.pdf_filename AS pdf_filename,
            a.pdf_error AS pdf_error,
            a.assessment_id AS assessment_id
          FROM applicants a
          JOIN assessments s ON s.assessment_id = a.assessment_id
          WHERE s.employer_id = ? AND s.role_id = ?
          ORDER BY COALESCE(a.submitted_utc, '') DESC, a.rowid DESC
        """
        cur.execute(q, (employer_id, role_id))
        rows = cur.fetchall()

    out = []
    for r in rows:
        d = dict(r)

        # Back-compat aliases (some older frontend code may read "name/email/status")
        if "name" not in d:
            d["name"] = d.get("applicant_name")
        if "email" not in d:
            d["email"] = d.get("applicant_email")
        if "status" not in d:
            # "status" here means PDF pipeline status in your UI
            d["status"] = d.get("pdf_status") or "unknown"

        # Build PDF download URL if PDF is ready
        pdf_url = None
        pdf_filename = d.get("pdf_filename")
        pdf_status = d.get("pdf_status") or "unknown"
        if pdf_filename and pdf_status == "success":
            pdf_url = f"/api/employer/pdf/{d.get('candidate_id')}"

        returnable = {
            "candidate_id": d.get("candidate_id"),
            "name": d.get("applicant_name") or d.get("name"),  # Frontend expects "name"
            "email": d.get("applicant_email") or d.get("email"),  # Frontend expects "email"
            "applicant_name": d.get("applicant_name") or d.get("name"),
            "applicant_email": d.get("applicant_email") or d.get("email"),
            "submitted_utc": d.get("submitted_utc"),
            "status": pdf_status,  # Frontend expects "status"
            "pdf_status": pdf_status,
            "pdf_filename": pdf_filename or "",
            "pdf_url": pdf_url,  # Frontend expects "pdf_url"
            "pdf_error": d.get("pdf_error") or "",
            "assessment_id": d.get("assessment_id") or "",
        }

        # Nice-to-have flags for UI
        ps = (returnable["pdf_status"] or "").lower()
        returnable["pdf_ready"] = (ps == "ready" or ps == "done" or ps == "complete" or ps == "success")
        returnable["pdf_failed"] = (ps == "failed" or ps == "error")

        out.append(returnable)

    return out
@router.delete("/{role_id}")
def delete_role(role_id: str, request: Request):
    employer_id = get_employer_id(request)

    with conn() as con:
        cur = con.cursor()

        # ensure role belongs to employer
        cur.execute("SELECT role_id FROM roles WHERE role_id=? AND employer_id=?", (role_id, employer_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Role not found")

        # find assessments for this role
        cur.execute(
            "SELECT assessment_id FROM assessments WHERE employer_id=? AND role_id=?",
            (employer_id, role_id)
        )
        aids = [r["assessment_id"] for r in cur.fetchall()]

        if aids:
            qMarks = ",".join(["?"] * len(aids))
            # cascade delete applicants + applicant_responses (if present)
            cur.execute(f"DELETE FROM applicants WHERE assessment_id IN ({qMarks})", aids)
            try:
                cur.execute(f"DELETE FROM applicant_responses WHERE assessment_id IN ({qMarks})", aids)
            except Exception:
                pass
            cur.execute(f"DELETE FROM assessments WHERE assessment_id IN ({qMarks})", aids)

        cur.execute("DELETE FROM roles WHERE employer_id=? AND role_id=?", (employer_id, role_id))
        con.commit()

    return {"status": "ok", "role_id": role_id}

