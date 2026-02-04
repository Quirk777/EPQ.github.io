# app/routes/webhooks.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.services import webhooks

router = APIRouter(prefix="/employer/webhooks", tags=["webhooks"])

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

class WebhookCreate(BaseModel):
    url: str
    event_type: str
    secret: Optional[str] = None

class WebhookToggle(BaseModel):
    active: bool

@router.post("")
def create_webhook(webhook: WebhookCreate, request: Request):
    """Register a new webhook."""
    employer_id = get_employer_id(request)
    
    # Validate event type
    valid_events = ["candidate.completed", "candidate.pdf_ready", "role.created"]
    if webhook.event_type not in valid_events:
        raise HTTPException(status_code=400, detail=f"Invalid event type. Must be one of: {', '.join(valid_events)}")
    
    webhook_id = webhooks.register_webhook(
        employer_id=employer_id,
        url=webhook.url,
        event_type=webhook.event_type,
        secret=webhook.secret
    )
    
    return {
        "webhook_id": webhook_id,
        "url": webhook.url,
        "event_type": webhook.event_type
    }

@router.get("")
def list_webhooks(request: Request):
    """List all webhooks for the current employer."""
    employer_id = get_employer_id(request)
    hooks = webhooks.list_webhooks(employer_id)
    return {"webhooks": hooks}

@router.delete("/{webhook_id}")
def delete_webhook(webhook_id: str, request: Request):
    """Delete a webhook."""
    employer_id = get_employer_id(request)
    success = webhooks.delete_webhook(webhook_id, employer_id)
    if not success:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"success": True}

@router.patch("/{webhook_id}")
def toggle_webhook(webhook_id: str, toggle: WebhookToggle, request: Request):
    """Enable or disable a webhook."""
    employer_id = get_employer_id(request)
    success = webhooks.toggle_webhook(webhook_id, employer_id, toggle.active)
    if not success:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"success": True, "active": toggle.active}

@router.get("/{webhook_id}/logs")
def get_webhook_logs(webhook_id: str, request: Request, limit: int = 50):
    """Get recent logs for a webhook."""
    employer_id = get_employer_id(request)
    logs = webhooks.get_webhook_logs(webhook_id, employer_id, limit)
    return {"logs": logs}
