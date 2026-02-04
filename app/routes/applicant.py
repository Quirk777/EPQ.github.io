# app/routes/applicant.py
import uuid
from pathlib import Path
from json import JSONDecodeError
import re

from fastapi import APIRouter, HTTPException, Request, BackgroundTasks, Depends
from fastapi.responses import FileResponse

import epq_core
from app.auth import require_employer
from app.services import db
from report_generator import generate_pdf_report

router = APIRouter(prefix="/applicant", tags=["applicant"])

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

import logging
logger = logging.getLogger(__name__)

def _generate_pdf_background(assessment_id: str, applicant_result: dict, employer_env: str, candidate_id: str):
    logger.info(f"[PDF_BG] Starting PDF generation for candidate {candidate_id}")
    try:
        logger.info(f"[PDF_BG] Calling generate_pdf_report with env={employer_env}, output_dir={REPORTS_DIR}")
        pdf_path = generate_pdf_report(
            applicant_result=applicant_result,
            employer_environment=employer_env,
            candidate_id=candidate_id,
            output_dir=str(REPORTS_DIR),
        )
        logger.info(f"[PDF_BG] generate_pdf_report returned: {pdf_path}")
        
        if not pdf_path:
            logger.error(f"[PDF_BG] PDF generation returned None for {candidate_id}")
            db.set_applicant_pdf_failed(candidate_id, "generate_pdf_report returned None")
            return

        pdf_filename = Path(pdf_path).name
        logger.info(f"[PDF_BG] Setting PDF success: {pdf_filename}")
        db.set_applicant_pdf_success(candidate_id, pdf_filename)
        logger.info(f"[PDF_BG] PDF generation complete for {candidate_id}")
        
        # Trigger webhook for PDF ready (synchronous call in background task)
        try:
            import asyncio
            from app.services.webhooks import trigger_webhooks
            a = db.get_assessment(assessment_id)
            if a:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(trigger_webhooks(
                    a.get("employer_id"),
                    "candidate.pdf_ready",
                    {
                        "candidate_id": candidate_id,
                        "assessment_id": assessment_id,
                        "pdf_filename": pdf_filename,
                        "pdf_url": f"/api/employer/pdf/{candidate_id}"
                    }
                ))
                loop.close()
        except Exception as webhook_error:
            logger.warning(f"[PDF_BG] Webhook failed for {candidate_id}: {webhook_error}")

    except Exception as e:
        logger.exception(f"[PDF_BG] PDF generation failed for {candidate_id}")
        db.set_applicant_pdf_failed(candidate_id, str(e))

def _expand_2_to_4_choices(choices: list[str]) -> list[str]:
    if len(choices) == 2:
        a, b = choices
        return [f"Strongly prefer: {a}", f"Slightly prefer: {a}", f"Slightly prefer: {b}", f"Strongly prefer: {b}"]
    if len(choices) == 3:
        # simple fallback: pad with a neutral-ish middle option
        return [choices[0], choices[1], choices[2], "Neutral / Unsure"]
    if len(choices) >= 4:
        return choices[:4]
    return ["Strongly disagree", "Disagree", "Agree", "Strongly agree"]

# app/routes/applicant.py

@router.get("/debug/raw-questions")
def debug_raw_questions():
    raw = epq_core.generate_questions(5)
    return {"raw": raw}

def _fix_mojibake(s: str) -> str:
    """
    Fix common UTF-8 -> cp1252 mojibake like Youâ€™re / didnâ€™t / itâ€™s.
    Safe: if it's already clean, it returns unchanged.
    """
    if not isinstance(s, str):
        s = str(s)
    try:
        # If string contains those telltale bytes, attempt repair
        if "â" in s or "Ã" in s:
            return s.encode("latin-1", errors="ignore").decode("utf-8", errors="ignore")
    except Exception:
        pass
    return s

@router.get("/{assessment_id}/questions")
def get_questions(assessment_id: str):
    a = db.get_assessment(assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    max_q = a.get("max_questions", 32)
    raw = epq_core.generate_questions(max_q)

    # Default EPQ-style 1..4 options (so the UI can render + applicant can submit)
    DEFAULT_CHOICES = [
        "Strongly disagree",
        "Disagree",
        "Agree",
        "Strongly agree",
    ]



    normalized: list[dict] = []

    if isinstance(raw, list):
        for i, q in enumerate(raw):
            if not isinstance(q, dict):
                continue

            qid = str(q.get("id") or q.get("qid") or q.get("key") or f"Q{i+1}")
            prompt = _fix_mojibake(
                q.get("prompt")
                or q.get("text")
                or q.get("question")
                or q.get("item")
                or ""
            )


            choices = (
                q.get("choices")
                or q.get("options")
                or q.get("answers")
                or q.get("responses")
                or None
            )

            # If core provides no choices (your case), inject defaults
            if not choices:
                choices = DEFAULT_CHOICES

            # If choices are list of dicts, map to strings
            if isinstance(choices, list) and choices and isinstance(choices[0], dict):
                choices = [
                    str(c.get("text") or c.get("label") or c.get("choice") or "").strip()
                    for c in choices
                ]

            # Force list[str] and fallback if empty
            if not isinstance(choices, list):
                choices = DEFAULT_CHOICES

            choices = [str(c).strip() for c in choices if str(c).strip()]
            choices = [str(c).strip() for c in choices if str(c).strip()]
            if len(choices) == 0:
                choices = DEFAULT_CHOICES

            # Accept 2–4 choices (your bank often has 2); trim only if >4
            if len(choices) > 4:
                choices = choices[:4]

            normalized.append({"id": qid, "prompt": str(prompt), "choices": choices})


    return {
        "assessment_id": assessment_id,
        "max_questions": max_q,
        "questions": normalized,
    }

@router.post("/{assessment_id}/submit")
async def submit(assessment_id: str, request: Request, background_tasks: BackgroundTasks):
    try:
        a = db.get_assessment(assessment_id)
        if not a:
            raise HTTPException(status_code=404, detail="Assessment not found")
    
        # ---- Safe JSON parse ----
        ct = (request.headers.get("content-type") or "").lower()
        if ct and "application/json" not in ct:
            raise HTTPException(status_code=400, detail="Content-Type must be application/json")
    
        try:
            body = await request.json()
        except JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON body")
        except Exception:
            raise HTTPException(status_code=400, detail="Could not parse JSON body")
    
        if not isinstance(body, dict):
            raise HTTPException(status_code=400, detail="JSON body must be an object")
    
        applicant_email= (body.get("email") or "").strip()
    
        # ---- Validate fields ----
        applicant_name = (body.get("name") or "").strip()
        applicant_email = (body.get("email") or "").strip().lower()
        responses = body.get("responses", {}) or {}
    
        if not applicant_name:
            raise HTTPException(status_code=400, detail="name is required")
        if not applicant_email:
            raise HTTPException(status_code=400, detail="email is required")
        if not EMAIL_RE.match(applicant_email):
            raise HTTPException(status_code=400, detail="email looks invalid")
        if not isinstance(responses, dict):
            raise HTTPException(status_code=400, detail="responses must be an object/dictionary")
    
        # ---- Clean responses: store CHOSEN TEXT (variable option counts supported) ----
        cleaned: dict[str, str] = {}
        for k, v in responses.items():
            qid = str(k).strip()
            if not qid:
                continue
            choice = "" if v is None else str(v).strip()
            if not choice:
                raise HTTPException(status_code=400, detail=f"responses['{qid}'] cannot be empty")
            cleaned[qid] = choice
    
        if not cleaned:
            raise HTTPException(status_code=400, detail="responses is required and cannot be empty")
    
        # ---- Score applicant (choice-text scoring) ----
        try:
            applicant_result = epq_core.run_applicant_from_choice_responses(cleaned)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Scoring failed: {exc}")
    
        candidate_id = "A-" + assessment_id[:8] + "-" + uuid.uuid4().hex[:6]
    
        # ---- Create applicant submission row (pending) ----
        try:
            db.create_applicant_submission(
                assessment_id=assessment_id,
                applicant_name=applicant_name,
                applicant_email=applicant_email,
                responses=cleaned,          # choice-text responses
                candidate_id=candidate_id,
                score=applicant_result,     # <- THIS is what the PDF should render
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"DB write failed: {exc}")
    
        # ---- Generate PDF in background using the computed result ----
        logger.info(f"[SUBMIT] Queueing background PDF task for {candidate_id}")
        background_tasks.add_task(
            _generate_pdf_background,
            assessment_id,
            applicant_result,
            a.get("environment", "moderate"),
            candidate_id,
        )
        logger.info(f"[SUBMIT] Background task queued successfully")
        
        # ---- Trigger webhooks for candidate completion ----
        from app.services.webhooks import trigger_webhooks
        background_tasks.add_task(
            trigger_webhooks,
            a.get("employer_id"),
            "candidate.completed",
            {
                "candidate_id": candidate_id,
                "assessment_id": assessment_id,
                "name": applicant_name,
                "email": applicant_email,
                "submitted_at": db.now_iso()
            }
        )

        return {"status": "processing", "candidate_id": candidate_id}

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print('APPLICANT SUBMIT ERROR:', tb)
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(status_code=500, detail='Submit failed: ' + str(e))
@router.get("/debug/questions-shape/{assessment_id}")
def debug_questions_shape(assessment_id: str):
    a = db.get_assessment(assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    max_q = a.get("max_questions", 32)
    raw = epq_core.generate_questions(max_q)

    return {
        "assessment_id": assessment_id,
        "max_q": max_q,
        "raw_type": str(type(raw)),
        "raw_preview": raw[:3] if isinstance(raw, list) else raw,
        "raw_len": len(raw) if isinstance(raw, list) else None,
    }

@router.get("/reports/by-candidate/{candidate_id}")
def get_report_by_candidate(candidate_id: str, employer=Depends(require_employer)):
    """
    Employer-only: download the generated PDF for a given candidate_id.
    """
    row = db.get_applicant(candidate_id)
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found")

    pdf_filename = row.get("pdf_filename") if isinstance(row, dict) else None
    pdf_status = row.get("pdf_status") if isinstance(row, dict) else None

    if not pdf_filename or pdf_status != "success":
        raise HTTPException(status_code=404, detail="PDF not ready")

    pdf_path = REPORTS_DIR / pdf_filename
    if not pdf_path.exists():
        # super helpful when debugging "DB says success but disk missing"
        raise HTTPException(status_code=404, detail=f"PDF file missing on disk: {pdf_path}")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=pdf_filename,
    )

@router.get("/debug/normalize/{assessment_id}")
def debug_normalize(assessment_id: str):
    a = db.get_assessment(assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    max_q = a.get("max_questions", 32)
    raw = epq_core.generate_questions(max_q)

    DEFAULT_CHOICES = ["Strongly disagree", "Disagree", "Agree", "Strongly agree"]

    normalized = []
    skipped = {"not_dict": 0, "empty_prompt": 0, "bad_choices": 0}

    if isinstance(raw, list):
        for i, q in enumerate(raw):
            if not isinstance(q, dict):
                skipped["not_dict"] += 1
                continue

            qid = str(q.get("id") or q.get("qid") or q.get("key") or f"Q{i+1}")
            prompt = (q.get("prompt") or q.get("text") or q.get("question") or q.get("item") or "")

            choices = (q.get("choices") or q.get("options") or q.get("answers") or q.get("responses") or None)
            if not choices:
                choices = DEFAULT_CHOICES

            if isinstance(choices, list) and choices and isinstance(choices[0], dict):
                choices = [str(c.get("text") or c.get("label") or c.get("choice") or "").strip() for c in choices]

            if not isinstance(choices, list):
                choices = DEFAULT_CHOICES

            choices = [str(c).strip() for c in choices if str(c).strip()]

            if not str(prompt).strip():
                skipped["empty_prompt"] += 1
                continue

            if len(choices) == 0:
                skipped["bad_choices"] += 1
                continue

            normalized.append({"id": qid, "prompt": str(prompt), "choices": choices[:4]})

    return {
        "raw_len": len(raw) if isinstance(raw, list) else None,
        "normalized_len": len(normalized),
        "skipped": skipped,
        "sample_normalized": normalized[:3],
        "sample_raw": raw[:3] if isinstance(raw, list) else raw,
    }

@router.get("/submissions")
def list_submissions(emp=Depends(require_employer)):
    """
    Employer dashboard feed:
    Lists submissions across all assessments owned by the employer.
    """
    employer_id = emp.get("employer_id") if isinstance(emp, dict) else None
    if not employer_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        rows = db.list_applicant_submissions_for_employer(employer_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"DB read failed: {exc}")

    items = []
    for r in rows or []:
        items.append(
            {
                "candidate_id": r.get("candidate_id", ""),
                "assessment_id": r.get("assessment_id", ""),
                "applicant_name": r.get("applicant_name", ""),
                "applicant_email": r.get("applicant_email", ""),
                "submitted_utc": r.get("submitted_utc", ""),
                "pdf_status": r.get("pdf_status", "pending"),
                "pdf_filename": r.get("pdf_filename") or "",
                "pdf_error": r.get("pdf_error") or "",
                "environment": r.get("environment") or "",
                "max_questions": r.get("max_questions") or 0,
            }
        )

    return {"items": items}

@router.get("/reports/by-candidate/{candidate_id}")
def get_report_by_candidate(candidate_id: str, emp=Depends(require_employer)):
    item = db.get_applicant(candidate_id)
    if not item:
        raise HTTPException(status_code=404, detail="Applicant not found")

    assessment_id = item.get("assessment_id")
    if not assessment_id:
        raise HTTPException(status_code=500, detail="Applicant missing assessment_id")

    a = db.get_assessment(assessment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if a.get("employer_id") != emp.get("employer_id"):
        raise HTTPException(status_code=403, detail="Forbidden")

    if item.get("pdf_status") != "success" or not item.get("pdf_filename"):
        raise HTTPException(status_code=404, detail="PDF not ready")

    pdf_filename = item["pdf_filename"]
    pdf_file = REPORTS_DIR / pdf_filename
    if not pdf_file.exists():
        raise HTTPException(status_code=404, detail="PDF missing on server")
  
    safe_name = (item.get("applicant_name") or "Applicant").strip()
    safe_name = "".join(ch for ch in safe_name if ch.isalnum() or ch in (" ","-","_")).strip().replace(" ", "_")
    download_name = f"{safe_name}_{candidate_id}.pdf"

    return FileResponse(pdf_file, media_type="application/pdf", filename=download_name)
    