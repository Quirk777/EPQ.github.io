# app/routes/team_fit.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from app.services.db import get_current_user_from_session
from app.services.team_fit import team_fit_analyzer

router = APIRouter(prefix="/employer/team-fit", tags=["team-fit"])

@router.get("/profile")
async def get_team_profile(
    role_id: Optional[str] = None,
    user: dict = Depends(get_current_user_from_session)
):
    """Get current team's environmental profile"""
    profile = await team_fit_analyzer.get_team_profile(
        employer_id=user["user_id"],
        role_id=role_id
    )
    return profile

@router.get("/candidate/{candidate_id}")
async def analyze_candidate_fit(
    candidate_id: str,
    role_id: Optional[str] = None,
    user: dict = Depends(get_current_user_from_session)
):
    """Analyze how well a candidate fits the existing team"""
    try:
        analysis = await team_fit_analyzer.calculate_fit_score(
            candidate_id=candidate_id,
            employer_id=user["user_id"],
            role_id=role_id
        )
        return analysis
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/compare")
async def compare_candidates(
    candidate_ids: List[str],
    role_id: Optional[str] = None,
    user: dict = Depends(get_current_user_from_session)
):
    """Compare multiple candidates' team fit scores"""
    comparison = await team_fit_analyzer.compare_candidates(
        candidate_ids=candidate_ids,
        employer_id=user["user_id"],
        role_id=role_id
    )
    return comparison
