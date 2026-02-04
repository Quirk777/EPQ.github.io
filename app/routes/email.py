import os
from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse
from app.email_subscriptions import set_subscribed_by_token, get_email_by_token

router = APIRouter(prefix="/email", tags=["email"])

def _base_url() -> str:
    return (os.getenv("PUBLIC_BASE_URL") or "http://localhost:3000").rstrip("/")

@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe(token: str = Query(..., min_length=10)):
    ok = set_subscribed_by_token(token, subscribed=False)
    email = get_email_by_token(token) if ok else None
    return HTMLResponse(f"""
    <html><body style="font-family: Arial; max-width: 720px; margin: 40px auto; padding: 0 16px;">
      <h2>You're unsubscribed ✅</h2>
      <p>{("We will stop sending updates to <b>" + email + "</b>.") if email else "We could not verify that link."}</p>
    </body></html>
    """)

@router.get("/resubscribe", response_class=HTMLResponse)
def resubscribe(token: str = Query(..., min_length=10)):
    ok = set_subscribed_by_token(token, subscribed=True)
    email = get_email_by_token(token) if ok else None
    return HTMLResponse(f"""
    <html><body style="font-family: Arial; max-width: 720px; margin: 40px auto; padding: 0 16px;">
      <h2>You're resubscribed 🎉</h2>
      <p>{("Welcome back, <b>" + email + "</b>.") if email else "We could not verify that link."}</p>
    </body></html>
    """)
