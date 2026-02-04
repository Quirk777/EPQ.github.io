# app/services/webhooks.py
"""
Webhook management and triggering service.
"""
import uuid
import json
import datetime
import sqlite3
import httpx
from pathlib import Path
from typing import Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = (PROJECT_ROOT / "epq.db").resolve()

def conn():
    con = sqlite3.connect(str(DB_PATH))
    con.row_factory = sqlite3.Row
    return con

def now_iso() -> str:
    return datetime.datetime.utcnow().isoformat()

# ============ WEBHOOK REGISTRATION ============

def register_webhook(employer_id: str, url: str, event_type: str, secret: Optional[str] = None) -> str:
    """
    Register a webhook for an employer.
    
    Event types:
    - candidate.completed: When a candidate completes assessment
    - candidate.pdf_ready: When PDF report is generated
    - role.created: When a new role is created
    """
    webhook_id = str(uuid.uuid4())
    
    with conn() as con:
        cur = con.cursor()
        cur.execute("""
            INSERT INTO webhooks (webhook_id, employer_id, url, event_type, secret)
            VALUES (?, ?, ?, ?, ?)
        """, (webhook_id, employer_id, url, event_type, secret))
        con.commit()
    
    return webhook_id

def list_webhooks(employer_id: str) -> List[Dict]:
    """List all webhooks for an employer."""
    with conn() as con:
        cur = con.cursor()
        cur.execute("""
            SELECT webhook_id, url, event_type, active, created_utc
            FROM webhooks
            WHERE employer_id = ?
            ORDER BY created_utc DESC
        """, (employer_id,))
        return [dict(r) for r in cur.fetchall()]

def delete_webhook(webhook_id: str, employer_id: str) -> bool:
    """Delete a webhook (employer can only delete their own)."""
    with conn() as con:
        cur = con.cursor()
        cur.execute("""
            DELETE FROM webhooks
            WHERE webhook_id = ? AND employer_id = ?
        """, (webhook_id, employer_id))
        con.commit()
        return cur.rowcount > 0

def toggle_webhook(webhook_id: str, employer_id: str, active: bool) -> bool:
    """Enable/disable a webhook."""
    with conn() as con:
        cur = con.cursor()
        cur.execute("""
            UPDATE webhooks
            SET active = ?
            WHERE webhook_id = ? AND employer_id = ?
        """, (1 if active else 0, webhook_id, employer_id))
        con.commit()
        return cur.rowcount > 0

# ============ WEBHOOK TRIGGERING ============

async def trigger_webhooks(employer_id: str, event_type: str, payload: Dict):
    """
    Trigger all active webhooks for an employer matching the event type.
    Runs asynchronously and logs results.
    """
    with conn() as con:
        cur = con.cursor()
        cur.execute("""
            SELECT webhook_id, url, secret
            FROM webhooks
            WHERE employer_id = ? AND event_type = ? AND active = 1
        """, (employer_id, event_type))
        
        webhooks = [dict(r) for r in cur.fetchall()]
    
    if not webhooks:
        return
    
    # Send webhooks asynchronously
    async with httpx.AsyncClient(timeout=10.0) as client:
        for hook in webhooks:
            await send_webhook(client, hook, event_type, payload)

async def send_webhook(client: httpx.AsyncClient, hook: Dict, event_type: str, payload: Dict):
    """Send a single webhook and log the result."""
    webhook_id = hook["webhook_id"]
    url = hook["url"]
    secret = hook.get("secret")
    
    # Prepare payload
    full_payload = {
        "event": event_type,
        "timestamp": now_iso(),
        "data": payload
    }
    
    headers = {"Content-Type": "application/json"}
    if secret:
        headers["X-Webhook-Secret"] = secret
    
    # Send request
    try:
        response = await client.post(url, json=full_payload, headers=headers)
        status_code = response.status_code
        response_body = response.text[:1000]  # Limit to 1000 chars
        error = None if 200 <= status_code < 300 else f"HTTP {status_code}"
    except Exception as e:
        status_code = None
        response_body = None
        error = str(e)[:500]
    
    # Log the result
    with conn() as con:
        cur = con.cursor()
        cur.execute("""
            INSERT INTO webhook_logs (webhook_id, event_type, payload_json, status_code, response_body, error)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (webhook_id, event_type, json.dumps(full_payload), status_code, response_body, error))
        con.commit()

def get_webhook_logs(webhook_id: str, employer_id: str, limit: int = 50) -> List[Dict]:
    """Get recent webhook logs (employer can only see their own)."""
    with conn() as con:
        cur = con.cursor()
        cur.execute("""
            SELECT wl.log_id, wl.event_type, wl.status_code, wl.error, wl.created_utc
            FROM webhook_logs wl
            JOIN webhooks w ON wl.webhook_id = w.webhook_id
            WHERE wl.webhook_id = ? AND w.employer_id = ?
            ORDER BY wl.created_utc DESC
            LIMIT ?
        """, (webhook_id, employer_id, limit))
        return [dict(r) for r in cur.fetchall()]
