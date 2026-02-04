"""
Reference Check API Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from app.services.reference_checker import ReferenceChecker
from app.services.db import get_current_user_from_session

router = APIRouter(prefix="/api/employer/references", tags=["references"])

# Pydantic models
class CreateReferenceRequest(BaseModel):
    candidate_id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    relationship: str  # manager, colleague, hr
    company: str

class SubmitResponseRequest(BaseModel):
    responses: List[Dict[str, Any]]

class EmploymentVerificationRequest(BaseModel):
    candidate_id: int
    company: str
    job_title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    verified: bool = False
    verification_source: str = "manual"
    discrepancy_flag: bool = False
    discrepancy_notes: Optional[str] = None

@router.post("/requests")
async def create_reference_request(
    request: CreateReferenceRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Create a new reference check request"""
    checker = ReferenceChecker()
    
    request_id = checker.create_reference_request(
        candidate_id=request.candidate_id,
        reference_data={
            'name': request.name,
            'email': request.email,
            'phone': request.phone,
            'relationship': request.relationship,
            'company': request.company
        }
    )
    
    # Generate email content
    email_data = checker.generate_reference_email(
        request_id=request_id,
        base_url="http://localhost:3000"  # TODO: Get from config
    )
    
    return {
        'request_id': request_id,
        'email': email_data,
        'status': 'sent'
    }

@router.get("/requests/{candidate_id}")
async def get_reference_requests(
    candidate_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get all reference requests for a candidate"""
    checker = ReferenceChecker()
    requests = checker.get_reference_requests(candidate_id)
    
    return {
        'requests': requests,
        'total': len(requests)
    }

@router.get("/request/{request_id}")
async def get_reference_request(
    request_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get details of a specific reference request"""
    checker = ReferenceChecker()
    conn = checker._ensure_tables()  # Ensure tables exist
    
    # Get request
    from app.services.db import get_db
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, candidate_id, reference_name, reference_email, 
               relationship, company, status, completed_at
        FROM reference_requests
        WHERE id = ?
    ''', (request_id,))
    
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Reference request not found")
    
    request_data = {
        'id': row[0],
        'candidate_id': row[1],
        'reference_name': row[2],
        'reference_email': row[3],
        'relationship': row[4],
        'company': row[5],
        'status': row[6],
        'completed_at': row[7],
    }
    
    # Get responses if completed
    responses = []
    if row[6] == 'completed':
        responses = checker.get_reference_responses(request_id)
    
    return {
        'request': request_data,
        'responses': responses
    }

@router.get("/questionnaire/{token}")
async def get_questionnaire_by_token(token: str):
    """Get questionnaire for reference to fill out (public endpoint)"""
    checker = ReferenceChecker()
    
    request_data = checker.get_request_by_token(token)
    if not request_data:
        raise HTTPException(status_code=404, detail="Invalid or expired reference link")
    
    if request_data['status'] == 'completed':
        raise HTTPException(status_code=400, detail="This reference has already been submitted")
    
    # Get candidate name for personalized questions
    from app.services.db import get_db
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM applicants WHERE id = ?', (request_data['candidate_id'],))
    candidate_row = cursor.fetchone()
    candidate_name = candidate_row[0] if candidate_row else "the candidate"
    
    # Get appropriate questionnaire template
    questions = checker.get_questionnaire_template(
        relationship=request_data['relationship'],
        candidate_name=candidate_name
    )
    
    return {
        'request_id': request_data['id'],
        'candidate_name': candidate_name,
        'reference_name': request_data['reference_name'],
        'relationship': request_data['relationship'],
        'company': request_data['company'],
        'questions': questions
    }

@router.post("/submit/{token}")
async def submit_reference_response(token: str, response_data: SubmitResponseRequest):
    """Submit reference questionnaire responses (public endpoint)"""
    checker = ReferenceChecker()
    
    request_data = checker.get_request_by_token(token)
    if not request_data:
        raise HTTPException(status_code=404, detail="Invalid or expired reference link")
    
    if request_data['status'] == 'completed':
        raise HTTPException(status_code=400, detail="This reference has already been submitted")
    
    # Submit responses
    success = checker.submit_reference_response(
        request_id=request_data['id'],
        responses=response_data.responses
    )
    
    return {
        'success': success,
        'message': 'Thank you for completing the reference check'
    }

@router.post("/reminder/{request_id}")
async def send_reminder(
    request_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Send reminder email for pending reference"""
    checker = ReferenceChecker()
    success = checker.send_reminder(request_id)
    
    if not success:
        raise HTTPException(status_code=400, detail="Cannot send reminder (request not pending)")
    
    return {'success': True, 'message': 'Reminder sent'}

@router.post("/verify-employment")
async def verify_employment(
    verification: EmploymentVerificationRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Add manual employment verification"""
    checker = ReferenceChecker()
    
    verification_id = checker.verify_employment(
        candidate_id=verification.candidate_id,
        employment_data=verification.dict()
    )
    
    return {
        'verification_id': verification_id,
        'status': 'verified' if verification.verified else 'pending'
    }

@router.get("/verifications/{candidate_id}")
async def get_employment_verifications(
    candidate_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get all employment verifications for candidate"""
    checker = ReferenceChecker()
    verifications = checker.get_employment_verifications(candidate_id)
    
    return {
        'verifications': verifications,
        'total': len(verifications)
    }

@router.get("/statistics/{candidate_id}")
async def get_reference_statistics(
    candidate_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get reference check statistics for candidate"""
    checker = ReferenceChecker()
    stats = checker.get_reference_statistics(candidate_id)
    
    return stats
