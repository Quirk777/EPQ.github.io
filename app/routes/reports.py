# app/routes/reports.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pathlib import Path
import os
import json

from app.auth import require_employer
from app.services import db

router = APIRouter(prefix="/reports", tags=["reports"])

# NOTE: We compute REPORTS_DIR here (no import from app.main to avoid circular imports)
PROJECT_ROOT = Path(__file__).resolve().parents[2]  # .../python_project
REPORTS_DIR = Path(os.environ.get("REPORTS_DIR") or (PROJECT_ROOT / "reports")).expanduser().resolve()
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def _stream_pdf(pdf_file: Path, download_name: str) -> StreamingResponse:
    """
    Stream a PDF from disk. Using StreamingResponse avoids some Windows FileResponse edge cases.
    """
    try:
        f = open(pdf_file, "rb")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to open PDF: {type(e).__name__}: {e}",
        )

    # Use "inline" to display in browser, not "attachment" to download
    headers = {"Content-Disposition": f'inline; filename="{download_name}"'}
    return StreamingResponse(f, media_type="application/pdf", headers=headers)


def _safe_reports_path(reports_dir: Path, raw_name: str) -> Path:
    """Resolve a DB-stored pdf_filename to a safe on-disk path under REPORTS_DIR."""
    raw = (raw_name or "").strip()
    if not raw:
        return reports_dir

    p = Path(raw)

    # If absolute, only allow it if it's actually under REPORTS_DIR.
    if p.is_absolute():
        try:
            rp = p.resolve()
            rd = reports_dir.resolve()
            if rp == rd or rd in rp.parents:
                return rp
        except Exception:
            pass
        # Fallback: keep basename only
        return reports_dir / p.name

    # If relative, strip directories to prevent traversal.
    return reports_dir / p.name


def _parse_json_field(value) -> dict:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        s = value.strip()
        if not s:
            return {}
        try:
            parsed = json.loads(s)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _regenerate_pdf_if_possible(candidate_id: str, applicant: dict, assessment: dict) -> str | None:
    """Attempt to regenerate missing PDFs from stored score_json.

    Returns a pdf filename (basename) if regenerated; otherwise None.
    """
    score = _parse_json_field(applicant.get("score_json"))
    if not score:
        return None

    employer_env = (assessment or {}).get("environment") or "Standard"

    try:
        from report_generator import generate_pdf_report
    except Exception:
        return None

    pdf_path = generate_pdf_report(
        applicant_result=score,
        employer_environment=employer_env,
        candidate_id=candidate_id,
        output_dir=str(REPORTS_DIR),
        auto_open=False,
    )

    if not pdf_path:
        return None

    try:
        pdf_filename = Path(pdf_path).name
    except Exception:
        return None

    # Persist the new filename so future loads are fast and consistent.
    try:
        db.set_applicant_pdf_success(candidate_id, pdf_filename)
    except Exception:
        pass

    return pdf_filename


@router.get("/by-assessment/{assessment_id}")
def get_pdf_by_assessment(assessment_id: str, emp=Depends(require_employer)):
    a = db.get_assessment(assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if a.get("employer_id") != emp.get("employer_id"):
        raise HTTPException(status_code=403, detail="Forbidden")

    pdf_filename = a.get("pdf_filename")
    if not pdf_filename:
        raise HTTPException(status_code=404, detail="PDF not ready")

    pdf_file = REPORTS_DIR / pdf_filename
    if not pdf_file.exists():
        raise HTTPException(status_code=404, detail=f"PDF missing on server: {pdf_filename}")

    return _stream_pdf(pdf_file, pdf_filename)


@router.get("/latest")
def latest_report(emp=Depends(require_employer)):
    """
    Returns the newest report (filename + assessment_id) that:
    - belongs to the logged-in employer
    - has a pdf_filename in the DB
    - AND the PDF file actually exists on disk in REPORTS_DIR
    """
    items = db.list_assessments_for_employer(emp.get("employer_id"))

    for a in items:
        fn = a.get("pdf_filename")
        if not fn:
            continue

        pdf_file = REPORTS_DIR / fn
        if pdf_file.exists():
            return {"filename": fn, "assessment_id": a.get("assessment_id")}

    raise HTTPException(status_code=404, detail="No reports yet")


@router.get("/{pdf_filename}")
def get_pdf_by_filename(pdf_filename: str, emp=Depends(require_employer)):
    """
    Secure filename route:
    only allows download if THIS employer owns an assessment whose pdf_filename matches.
    """
    items = db.list_assessments_for_employer(emp.get("employer_id"))
    owned = any(a.get("pdf_filename") == pdf_filename for a in items)
    if not owned:
        raise HTTPException(status_code=404, detail="Not Found")

    pdf_file = REPORTS_DIR / pdf_filename
    if not pdf_file.exists():
        raise HTTPException(status_code=404, detail=f"PDF not found: {pdf_filename}")

    return _stream_pdf(pdf_file, pdf_filename)

# ---- Added: download report by candidate_id (secure, employer-only) ----
from fastapi import Depends
from app.auth import require_employer
from app.services import db

@router.get("/by-candidate/{candidate_id}")
def get_pdf_by_candidate(candidate_id: str, emp=Depends(require_employer)):
    import logging
    logger = logging.getLogger("uvicorn.error")
    
    logger.info(f"PDF request for candidate: {candidate_id}")
    logger.info(f"Employer: {emp.get('employer_id')}")
    
    item = db.get_applicant(candidate_id)
    if not item:
        logger.error(f"Applicant not found: {candidate_id}")
        raise HTTPException(status_code=404, detail="Applicant not found")

    logger.info(f"Applicant found: {item.get('applicant_name')}")
    
    assessment_id = item.get("assessment_id")
    if not assessment_id:
        logger.error(f"Applicant missing assessment_id")
        raise HTTPException(status_code=500, detail="Applicant missing assessment_id")

    a = db.get_assessment(assessment_id)
    if not a:
        logger.error(f"Assessment not found: {assessment_id}")
        raise HTTPException(status_code=404, detail="Assessment not found")

    logger.info(f"Assessment found, employer: {a.get('employer_id')}")
    
    if a.get("employer_id") != emp.get("employer_id"):
        logger.error(f"Forbidden: assessment employer {a.get('employer_id')} != logged in employer {emp.get('employer_id')}")
        raise HTTPException(status_code=403, detail="Forbidden")

    if item.get("pdf_status") != "success":
        logger.error(f"PDF not ready: status={item.get('pdf_status')}, filename={item.get('pdf_filename')}")
        raise HTTPException(status_code=404, detail="PDF not ready")

    pdf_filename = (item.get("pdf_filename") or "").strip()
    pdf_file = _safe_reports_path(REPORTS_DIR, pdf_filename) if pdf_filename else Path("")
    
    logger.info(f"Checking PDF file: {pdf_file}")

    if not pdf_filename:
        logger.error("Applicant marked success but pdf_filename is empty; attempting regeneration")
        regenerated = _regenerate_pdf_if_possible(candidate_id, item, a)
        if not regenerated:
            raise HTTPException(status_code=404, detail="PDF missing on server")
        pdf_filename = regenerated
        pdf_file = _safe_reports_path(REPORTS_DIR, pdf_filename)

    if not pdf_file.exists():
        logger.error(f"PDF missing on server: {pdf_file}; attempting regeneration")
        regenerated = _regenerate_pdf_if_possible(candidate_id, item, a)
        if regenerated:
            pdf_filename = regenerated
            pdf_file = _safe_reports_path(REPORTS_DIR, pdf_filename)

    if not pdf_file.exists():
        logger.error(f"PDF still missing after regeneration attempt: {pdf_file}")
        raise HTTPException(status_code=404, detail="PDF missing on server")

    logger.info(f"Streaming PDF: {pdf_filename}")
    return _stream_pdf(pdf_file, pdf_filename)
# ---- End added route ----