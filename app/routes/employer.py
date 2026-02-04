# app/routes/employer.py
from fastapi import APIRouter, HTTPException, Request, Depends
from typing import List
from app.services.employer_epq import get_employer_epq_questions
from pathlib import Path
from json import JSONDecodeError
from app.auth import require_employer
from app.services import db
import epq_core

router = APIRouter(prefix="/employer", tags=["employer"])

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

def require_active_employer(emp: dict):
    if emp.get("subscription_status") != "active":
        raise HTTPException(
            status_code=402,
            detail="Subscription inactive. Activate employer to access assessments and reports.",
        )
    return emp

@router.get("/me")
def me(emp=Depends(require_employer)):
    return {"employer": dict(emp)}

@router.get("/epq/questions")
def epq_questions(request: Request):
    """Return the 20 employer EPQ questions for role setup UI."""
    try:
        from app.services.employer_epq import get_employer_epq_questions
        payload = get_employer_epq_questions()
        items = payload.get("items") if isinstance(payload, dict) else None
        if isinstance(items, list) and len(items) >= 20:
            return items[:20]
        if isinstance(items, list) and len(items) > 0:
            return items
    except Exception:
        pass

    # Last-resort fallback (keeps UI from crashing)
    return [{"id":"Q1","prompt":"EPQ question set missing (could not load app.services.employer_epq).","choices":["Option 1","Option 2","Option 3","Option 4"]}]

@router.get("/dashboard")
def dashboard(emp=Depends(require_employer)):
    employer_id = emp.get("employer_id")
    assessments = db.list_assessments_for_employer(employer_id)
    return {"employer": dict(emp), "assessments": assessments}

@router.get("/submissions")
def submissions(emp=Depends(require_employer)):
    """
    Employer dashboard feed:
    Returns a flat list of all applicant submissions across all assessments
    owned by the logged-in employer.

    Shape:
      { "items": [ {candidate_id, assessment_id, applicant_name, applicant_email, ...}, ... ] }
    """
    employer_id = emp.get("employer_id")
    if not employer_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    assessments = db.list_assessments_for_employer(employer_id)

    items: List[dict] = []

    for a in assessments:
        assessment_id = a.get("assessment_id")
        if not assessment_id:
            continue

        applicants = db.list_applicants_for_assessment(assessment_id)

        for ap in applicants:
            # ap already includes: candidate_id, applicant_name, applicant_email, submitted_utc, pdf_status, pdf_filename, pdf_error
            candidate_id = ap.get("candidate_id")
            pdf_filename = ap.get("pdf_filename")
            pdf_status = ap.get("pdf_status", "pending")
            
            # Build PDF download URL if PDF is ready
            pdf_url = None
            if pdf_filename and pdf_status == "success":
                pdf_url = f"/api/employer/pdf/{candidate_id}"
            
            items.append(
                {
                    "candidate_id": candidate_id,
                    "assessment_id": assessment_id,
                    "name": ap.get("applicant_name"),  # Frontend expects "name"
                    "email": ap.get("applicant_email"),  # Frontend expects "email"
                    "submitted_utc": ap.get("submitted_utc"),
                    "status": pdf_status,  # Frontend expects "status"
                    "pdf_status": pdf_status,  # Keep for backwards compatibility
                    "pdf_filename": pdf_filename,
                    "pdf_url": pdf_url,
                    "pdf_error": ap.get("pdf_error"),
                    "environment": a.get("environment"),
                    "max_questions": a.get("max_questions"),
                }
            )

    # Sort newest-first (works even if sqlite returns ISO-ish strings)
    items.sort(key=lambda x: str(x.get("submitted_utc") or ""), reverse=True)

    return {"items": items}

@router.get("/candidates/{candidate_id}")
def get_candidate_details(candidate_id: str, emp=Depends(require_employer)):
    """
    Get detailed information about a specific candidate/applicant.
    Returns candidate info including responses, scores, PDF status, etc.
    """
    employer_id = emp.get("employer_id")
    if not employer_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Get the applicant data
    applicant = db.get_applicant(candidate_id)
    if not applicant:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get the assessment to verify ownership
    assessment_id = applicant.get("assessment_id")
    if assessment_id:
        assessment = db.get_assessment(assessment_id)
        if assessment and assessment.get("employer_id") != employer_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Build PDF URL if available
    pdf_url = None
    pdf_status = applicant.get("pdf_status", "pending")
    pdf_filename = applicant.get("pdf_filename")
    if pdf_filename and pdf_status == "success":
        pdf_url = f"/api/employer/pdf/{candidate_id}"
    
    # Return candidate details
    return {
        "candidate_id": candidate_id,
        "name": applicant.get("applicant_name"),
        "email": applicant.get("applicant_email"),
        "submitted_utc": applicant.get("submitted_utc"),
        "status": pdf_status,
        "pdf_status": pdf_status,
        "pdf_url": pdf_url,
        "pdf_filename": pdf_filename,
        "pdf_error": applicant.get("pdf_error"),
        "responses": applicant.get("responses_json"),
        "score": applicant.get("score_json"),
        "environment": applicant.get("environment"),
        "notes": [],  # TODO: Implement notes storage
        "tags": [],   # TODO: Implement tags storage
        "feedback": [] # TODO: Implement feedback storage
    }

@router.get("/assessments/{assessment_id}/applicants")
def applicants_for_assessment(assessment_id: str, emp=Depends(require_employer)):
    a = db.get_assessment(assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if a.get("employer_id") != emp.get("employer_id"):
        raise HTTPException(status_code=403, detail="Forbidden")

    items = db.list_applicants_for_assessment(assessment_id)
    
    # Add pdf_url for frontend
    for item in items:
        if item.get("pdf_filename") and item.get("pdf_status") == "success":
            item["pdf_url"] = f"/api/employer/pdf/{item.get('candidate_id')}"
        else:
            item["pdf_url"] = None
    
    return {"assessment_id": assessment_id, "applicants": items}

from json import JSONDecodeError

async def _read_json_object_allow_empty(req: Request) -> dict:
    """
    Allows empty body (treat as {}), but if body is present it must be valid JSON object.
    """
    ct = (req.headers.get("content-type") or "").lower()

    # If client sends content-type but it's not json, reject
    if ct and "application/json" not in ct:
        raise HTTPException(status_code=400, detail="Content-Type must be application/json")

    # If body is empty, treat as {}
    raw = await req.body()
    if not raw or not raw.strip():
        return {}

    try:
        body = await req.json()
    except JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse JSON body")

    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON body must be an object")

    return body

def _normalize_employer_answers(raw: dict) -> dict:
    out = {}
    for k, v in (raw or {}).items():
        try:
            iv = int(v)
        except Exception:
            continue
        if 1 <= iv <= 4:
            out[str(k)] = iv
    return out

@router.post("/assessments")
async def create_assessment(request: Request, emp=Depends(require_employer)):
    employer_id = emp.get("employer_id")

    body = await _read_json_object_allow_empty(request)
    raw_answers = body.get("answers", {}) or {}
    answers = _normalize_employer_answers(raw_answers)

    # require all 20 answered (if you want strictness)
    if len(answers) < 20:
        raise HTTPException(status_code=400, detail="All 20 employer EPQ questions must be answered (1-4).")

    env, max_q = epq_core.environment_and_max_questions_from_employer_answers(answers)

    assessment_id = db.create_assessment(employer_id, env, max_q)

    return {
        "assessment_id": assessment_id,
        "applicant_url": f"/applicant/{assessment_id}/questions",
        "environment": env,
        "max_questions": max_q,
    }

# Optional: keep ID-based routes if you still want them (secured)
@router.get("/{employer_id}/assessments")
def list_assessments(employer_id: str, emp=Depends(require_employer)):
    if emp.get("employer_id") != employer_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    items = db.list_assessments_for_employer(employer_id)
    return {"employer": dict(emp), "assessments": items}


@router.post("/{employer_id}/assessments")
async def create_assessment_for_id(employer_id: str, request: Request, emp=Depends(require_employer)):
    if emp.get("employer_id") != employer_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    body = await _read_json_object_allow_empty(request)
    answers = body.get("answers", {}) or {}

    env, max_q = (
        epq_core.environment_and_max_questions_from_employer_answers(answers)
        if answers else ("moderate", 32)
    )

    assessment_id = db.create_assessment(employer_id, env, max_q)

    return {
        "assessment_id": assessment_id,
        "applicant_url": f"/applicant/{assessment_id}/questions",
        "environment": env,
        "max_questions": max_q,
    }

