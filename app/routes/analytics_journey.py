# app/routes/analytics_journey.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from app.services.db import get_current_user_from_session
from app.services.journey_analytics import journey_analytics

router = APIRouter(prefix="/employer/analytics", tags=["analytics"])

class TrackEventRequest(BaseModel):
    event_type: str
    role_id: str
    candidate_id: Optional[str] = None
    event_data: Optional[Dict] = None
    session_id: Optional[str] = None

class ABTestRequest(BaseModel):
    role_id: str
    variants: List[Dict[str, str]]

@router.post("/track")
async def track_event(
    request: TrackEventRequest,
    user: dict = Depends(get_current_user_from_session)
):
    """Track a candidate journey event"""
    event_id = await journey_analytics.track_event(
        event_type=request.event_type,
        role_id=request.role_id,
        employer_id=user["user_id"],
        candidate_id=request.candidate_id,
        event_data=request.event_data,
        session_id=request.session_id
    )
    return {"event_id": event_id}

@router.get("/funnel")
async def get_funnel(
    role_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(get_current_user_from_session)
):
    """Get conversion funnel data"""
    funnel = await journey_analytics.get_funnel_data(
        employer_id=user["user_id"],
        role_id=role_id,
        start_date=start_date,
        end_date=end_date
    )
    return funnel

@router.get("/time-to-completion")
async def get_time_metrics(
    role_id: Optional[str] = None,
    user: dict = Depends(get_current_user_from_session)
):
    """Get average time between stages"""
    metrics = await journey_analytics.get_time_to_completion(
        employer_id=user["user_id"],
        role_id=role_id
    )
    return metrics

@router.post("/ab-test")
async def create_ab_test(
    request: ABTestRequest,
    user: dict = Depends(get_current_user_from_session)
):
    """Create A/B test variants for job posting"""
    variant_ids = await journey_analytics.create_ab_test(
        role_id=request.role_id,
        employer_id=user["user_id"],
        variants=request.variants
    )
    return {"variant_ids": variant_ids}

@router.get("/ab-test/{role_id}")
async def get_ab_results(
    role_id: str,
    user: dict = Depends(get_current_user_from_session)
):
    """Get A/B test results"""
    results = await journey_analytics.get_ab_test_results(
        role_id=role_id,
        employer_id=user["user_id"]
    )
    return results
