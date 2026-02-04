"""
Talent Pool CRM API Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.talent_pool import TalentPoolManager
from app.services.db import get_current_user_from_session

router = APIRouter(prefix="/api/employer/talent-pool", tags=["talent_pool"])

# Pydantic models
class AddToPoolRequest(BaseModel):
    candidate_id: int
    pool_type: str
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

class CreateCampaignRequest(BaseModel):
    name: str
    campaign_type: str
    pool_type: str
    email_sequence: List[Dict[str, Any]]

class EnrollCampaignRequest(BaseModel):
    pool_candidate_id: int
    campaign_id: int

class TrackEngagementRequest(BaseModel):
    touchpoint_id: int
    engagement_type: str  # open, click, reply

@router.post("/add-candidate")
async def add_candidate_to_pool(
    request: AddToPoolRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Add candidate to talent pool"""
    manager = TalentPoolManager()
    
    pool_id = manager.add_to_pool(
        candidate_id=request.candidate_id,
        pool_type=request.pool_type,
        tags=request.tags,
        notes=request.notes
    )
    
    return {
        'pool_id': pool_id,
        'status': 'added'
    }

@router.get("/candidates")
async def get_pool_candidates(
    pool_type: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get candidates in talent pool"""
    manager = TalentPoolManager()
    candidates = manager.get_pool_candidates(pool_type, status)
    
    return {
        'candidates': candidates,
        'total': len(candidates)
    }

@router.get("/pool-types")
async def get_pool_types():
    """Get available pool types"""
    manager = TalentPoolManager()
    
    return {
        'pool_types': [
            {'key': k, 'description': v}
            for k, v in manager.POOL_TYPES.items()
        ]
    }

@router.post("/update-score/{pool_candidate_id}")
async def update_engagement_score(
    pool_candidate_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Recalculate and update engagement score"""
    manager = TalentPoolManager()
    score = manager.update_engagement_score(pool_candidate_id)
    
    return {
        'pool_candidate_id': pool_candidate_id,
        'engagement_score': score
    }

@router.post("/campaigns")
async def create_campaign(
    request: CreateCampaignRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Create a nurture campaign"""
    manager = TalentPoolManager()
    
    campaign_id = manager.create_campaign(
        name=request.name,
        campaign_type=request.campaign_type,
        pool_type=request.pool_type,
        email_sequence=request.email_sequence
    )
    
    return {
        'campaign_id': campaign_id,
        'status': 'created'
    }

@router.get("/campaigns/templates")
async def get_campaign_templates():
    """Get campaign templates"""
    manager = TalentPoolManager()
    
    return {
        'templates': manager.CAMPAIGN_TEMPLATES
    }

@router.post("/campaigns/enroll")
async def enroll_in_campaign(
    request: EnrollCampaignRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Enroll candidate in nurture campaign"""
    manager = TalentPoolManager()
    
    enrollment_id = manager.enroll_in_campaign(
        pool_candidate_id=request.pool_candidate_id,
        campaign_id=request.campaign_id
    )
    
    if not enrollment_id:
        raise HTTPException(status_code=400, detail="Failed to enroll candidate")
    
    return {
        'enrollment_id': enrollment_id,
        'status': 'enrolled'
    }

@router.post("/track-engagement")
async def track_engagement(
    request: TrackEngagementRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Track email engagement (open, click, reply)"""
    manager = TalentPoolManager()
    
    success = manager.track_email_engagement(
        touchpoint_id=request.touchpoint_id,
        engagement_type=request.engagement_type
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to track engagement")
    
    return {
        'success': True,
        'engagement_type': request.engagement_type
    }

@router.get("/campaigns/{campaign_id}/performance")
async def get_campaign_performance(
    campaign_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get campaign performance metrics"""
    manager = TalentPoolManager()
    performance = manager.get_campaign_performance(campaign_id)
    
    if not performance:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return performance

@router.get("/statistics")
async def get_pool_statistics(
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get overall talent pool statistics"""
    manager = TalentPoolManager()
    stats = manager.get_pool_statistics()
    
    return stats
