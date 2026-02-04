# app/routes/exports.py
import json
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, JSONResponse
from app.services import exports

router = APIRouter(prefix="/employer/exports", tags=["exports"])

def get_employer_id(request: Request) -> str:
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

@router.get("/candidates.csv")
def export_candidates_csv(request: Request):
    """Export all candidates to CSV format."""
    employer_id = get_employer_id(request)
    csv_content = exports.export_candidates_csv(employer_id)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=candidates.csv"}
    )

@router.get("/candidates.json")
def export_candidates_json(request: Request):
    """Export all candidates to JSON format."""
    employer_id = get_employer_id(request)
    data = exports.export_candidates_json(employer_id)
    
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=candidates.json"}
    )

@router.get("/candidates/{candidate_id}.json")
def export_candidate_detail(candidate_id: str, request: Request):
    """Export a single candidate's full details to JSON."""
    employer_id = get_employer_id(request)
    data = exports.export_candidate_detail_json(candidate_id, employer_id)
    
    if not data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=candidate_{candidate_id}.json"}
    )
