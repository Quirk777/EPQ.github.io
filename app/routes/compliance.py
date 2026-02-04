"""
Compliance & Audit Trail API Routes
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.compliance import ComplianceManager
from app.services.db import get_current_user_from_session

router = APIRouter(prefix="/api/employer/compliance", tags=["compliance"])

# Pydantic models
class LogActionRequest(BaseModel):
    action: str
    resource_type: str
    resource_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None

class ConsentRequest(BaseModel):
    candidate_id: int
    consent_type: str
    granted: bool
    ip_address: Optional[str] = None

class DeletionRequest(BaseModel):
    candidate_id: int
    notes: Optional[str] = None

class ProcessDeletionRequest(BaseModel):
    approved: bool

class AuditLogFilters(BaseModel):
    user_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    limit: int = 100

@router.post("/audit-log")
async def create_audit_log(
    log_request: LogActionRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Create an audit log entry"""
    manager = ComplianceManager()
    
    log_id = manager.log_action(
        user_id=current_user['id'],
        action=log_request.action,
        resource_type=log_request.resource_type,
        resource_id=log_request.resource_id,
        details=log_request.details,
        ip_address=log_request.ip_address
    )
    
    return {'log_id': log_id, 'status': 'logged'}

@router.post("/audit-logs/search")
async def search_audit_logs(
    filters: AuditLogFilters,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Search audit logs with filters"""
    manager = ComplianceManager()
    
    filter_dict = {k: v for k, v in filters.dict().items() if v is not None and k != 'limit'}
    logs = manager.get_audit_logs(filters=filter_dict, limit=filters.limit)
    
    return {
        'logs': logs,
        'total': len(logs)
    }

@router.get("/audit-logs/recent")
async def get_recent_audit_logs(
    limit: int = 50,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get recent audit logs"""
    manager = ComplianceManager()
    logs = manager.get_audit_logs(limit=limit)
    
    return {
        'logs': logs,
        'total': len(logs)
    }

@router.post("/consent")
async def record_consent(
    consent: ConsentRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Record candidate consent"""
    manager = ComplianceManager()
    
    consent_id = manager.record_consent(
        candidate_id=consent.candidate_id,
        consent_type=consent.consent_type,
        granted=consent.granted,
        ip_address=consent.ip_address
    )
    
    # Log the consent action
    manager.log_action(
        user_id=current_user['id'],
        action='record_consent',
        resource_type='candidate',
        resource_id=consent.candidate_id,
        details={'consent_type': consent.consent_type, 'granted': consent.granted}
    )
    
    return {
        'consent_id': consent_id,
        'status': 'recorded'
    }

@router.get("/consent/{candidate_id}")
async def get_candidate_consents(
    candidate_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get all consent records for a candidate"""
    manager = ComplianceManager()
    consents = manager.get_consents(candidate_id)
    
    return {
        'consents': consents,
        'total': len(consents)
    }

@router.post("/anonymize/{candidate_id}")
async def anonymize_candidate(
    candidate_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Create anonymized profile for blind screening"""
    manager = ComplianceManager()
    
    profile = manager.anonymize_candidate(candidate_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Log the anonymization
    manager.log_action(
        user_id=current_user['id'],
        action='anonymize_candidate',
        resource_type='candidate',
        resource_id=candidate_id
    )
    
    return profile

@router.get("/anonymized-profiles")
async def get_anonymized_profiles(
    role_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get anonymized candidate profiles for blind screening"""
    manager = ComplianceManager()
    profiles = manager.get_anonymized_profiles(role_id)
    
    return {
        'profiles': profiles,
        'total': len(profiles)
    }

@router.post("/deletion-request")
async def create_deletion_request(
    request: DeletionRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Create GDPR data deletion request"""
    manager = ComplianceManager()
    
    request_id = manager.request_data_deletion(
        candidate_id=request.candidate_id,
        notes=request.notes
    )
    
    # Log the deletion request
    manager.log_action(
        user_id=current_user['id'],
        action='deletion_request',
        resource_type='candidate',
        resource_id=request.candidate_id
    )
    
    return {
        'request_id': request_id,
        'status': 'pending'
    }

@router.get("/deletion-requests")
async def get_deletion_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Get data deletion requests"""
    manager = ComplianceManager()
    requests = manager.get_deletion_requests(status)
    
    return {
        'requests': requests,
        'total': len(requests)
    }

@router.post("/deletion-request/{request_id}/process")
async def process_deletion_request(
    request_id: int,
    process_data: ProcessDeletionRequest,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Process GDPR deletion request"""
    manager = ComplianceManager()
    
    success = manager.process_deletion_request(
        request_id=request_id,
        user_id=current_user['id'],
        approved=process_data.approved
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to process deletion request")
    
    return {
        'success': True,
        'status': 'approved' if process_data.approved else 'rejected'
    }

@router.get("/report")
async def get_compliance_report(
    current_user: dict = Depends(get_current_user_from_session)
):
    """Generate compliance overview report"""
    manager = ComplianceManager()
    report = manager.get_compliance_report()
    
    return report

@router.get("/export/{candidate_id}")
async def export_candidate_data(
    candidate_id: int,
    current_user: dict = Depends(get_current_user_from_session)
):
    """Export all candidate data (GDPR right to access)"""
    manager = ComplianceManager()
    
    data = manager.export_candidate_data(candidate_id)
    
    if not data:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Log the data export
    manager.log_action(
        user_id=current_user['id'],
        action='export_candidate_data',
        resource_type='candidate',
        resource_id=candidate_id
    )
    
    return JSONResponse(content=data)

@router.get("/consent-types")
async def get_consent_types():
    """Get available consent types"""
    manager = ComplianceManager()
    
    return {
        'consent_types': [
            {'key': k, 'description': v} 
            for k, v in manager.CONSENT_TYPES.items()
        ]
    }
