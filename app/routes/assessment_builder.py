# app/routes/assessment_builder.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict
from app.services.db import get_current_user_from_session
from app.services.assessment_builder import assessment_builder

router = APIRouter(prefix="/employer/assessment-builder", tags=["assessment-builder"])

class CreateTemplateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    industry: Optional[str] = None
    questions: List[Dict]
    construct_weights: Optional[Dict[str, float]] = None
    white_label_name: Optional[str] = None

class UpdateTemplateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    questions: Optional[List[Dict]] = None
    construct_weights: Optional[Dict[str, float]] = None
    is_active: Optional[bool] = None
    white_label_name: Optional[str] = None

class IndustryTemplateRequest(BaseModel):
    industry_key: str
    custom_name: Optional[str] = None

@router.post("/templates")
async def create_template(
    request: CreateTemplateRequest,
    user: dict = Depends(get_current_user_from_session)
):
    """Create new custom assessment template"""
    template_id = await assessment_builder.create_template(
        employer_id=user["user_id"],
        name=request.name,
        description=request.description,
        industry=request.industry,
        questions=request.questions,
        construct_weights=request.construct_weights,
        white_label_name=request.white_label_name
    )
    return {"template_id": template_id}

@router.get("/templates")
async def list_templates(
    include_public: bool = True,
    user: dict = Depends(get_current_user_from_session)
):
    """List all available templates"""
    templates = await assessment_builder.list_templates(
        employer_id=user["user_id"],
        include_public=include_public
    )
    return {"templates": templates}

@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    user: dict = Depends(get_current_user_from_session)
):
    """Get template details"""
    try:
        template = await assessment_builder.get_template(
            template_id=template_id,
            employer_id=user["user_id"]
        )
        return template
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/templates/{template_id}")
async def update_template(
    template_id: str,
    request: UpdateTemplateRequest,
    user: dict = Depends(get_current_user_from_session)
):
    """Update template"""
    updates = request.dict(exclude_unset=True)
    success = await assessment_builder.update_template(
        template_id=template_id,
        employer_id=user["user_id"],
        **updates
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Update failed")
    
    return {"success": True}

@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    user: dict = Depends(get_current_user_from_session)
):
    """Delete template"""
    success = await assessment_builder.delete_template(
        template_id=template_id,
        employer_id=user["user_id"]
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"success": True}

@router.get("/question-bank")
async def get_question_bank(
    user: dict = Depends(get_current_user_from_session)
):
    """Get question bank for building assessments"""
    questions = await assessment_builder.get_question_bank()
    return {"question_bank": questions}

@router.get("/industry-templates")
async def get_industry_templates(
    user: dict = Depends(get_current_user_from_session)
):
    """Get industry template definitions"""
    templates = await assessment_builder.get_industry_templates()
    return {"industry_templates": templates}

@router.post("/industry-templates")
async def create_from_industry(
    request: IndustryTemplateRequest,
    user: dict = Depends(get_current_user_from_session)
):
    """Create assessment from industry template"""
    try:
        template_id = await assessment_builder.create_from_industry_template(
            employer_id=user["user_id"],
            industry_key=request.industry_key,
            custom_name=request.custom_name
        )
        return {"template_id": template_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
