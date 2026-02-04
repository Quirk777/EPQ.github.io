"""
Predictive Attrition Risk API Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.attrition_predictor import AttritionPredictor
from app.services.db import get_current_user_from_session

router = APIRouter(prefix="/api/employer/attrition", tags=["attrition"])

# Pydantic models
class CalculateRiskRequest(BaseModel):
    candidate_id: int

class AddEmploymentHistoryRequest(BaseModel):
    candidate_id: int
    employment_history: List[Dict[str, Any]]

class CreateInterventionRequest(BaseModel):
    candidate_id: int
    intervention_type: str
    description: str
    scheduled_date: Optional[str] = None

@router.post("/calculate-risk")
async def calculate_risk(
    request: CalculateRiskRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Calculate attrition risk score for candidate"""
    predictor = AttritionPredictor()
    
    assessment = predictor.calculate_risk_score(request.candidate_id)
    
    if not assessment:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    return assessment

@router.get("/risk-assessment/{candidate_id}")
async def get_risk_assessment(
    candidate_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get latest risk assessment for candidate"""
    predictor = AttritionPredictor()
    assessment = predictor.get_risk_assessment(candidate_id)
    
    if not assessment:
        # Calculate new assessment if none exists
        assessment = predictor.calculate_risk_score(candidate_id)
    
    return assessment

@router.post("/employment-history")
async def add_employment_history(
    request: AddEmploymentHistoryRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Add employment history for candidate"""
    predictor = AttritionPredictor()
    
    count = predictor.add_employment_history(
        candidate_id=request.candidate_id,
        employment_data=request.employment_history
    )
    
    return {
        'candidate_id': request.candidate_id,
        'jobs_added': count,
        'status': 'success'
    }

@router.get("/high-risk-candidates")
async def get_high_risk_candidates(
    limit: int = 20,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get candidates with high attrition risk"""
    predictor = AttritionPredictor()
    candidates = predictor.get_high_risk_candidates(limit)
    
    return {
        'candidates': candidates,
        'total': len(candidates)
    }

@router.post("/intervention")
async def create_intervention(
    request: CreateInterventionRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Create retention intervention plan"""
    predictor = AttritionPredictor()
    
    intervention_id = predictor.create_retention_intervention(
        candidate_id=request.candidate_id,
        intervention_type=request.intervention_type,
        description=request.description,
        scheduled_date=request.scheduled_date
    )
    
    return {
        'intervention_id': intervention_id,
        'status': 'created'
    }

@router.get("/statistics")
async def get_attrition_statistics(
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get overall attrition risk statistics"""
    predictor = AttritionPredictor()
    stats = predictor.get_attrition_statistics()
    
    return stats
