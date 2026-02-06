import os
import re
import logging
from app.email_gmail import send_email_gmail_smtp
from app.email_subscriptions import upsert_subscription
from app.services.email_service import send_verification_email, send_password_reset_email
from app.services.rate_limit import get_limiter
# app/auth.py
from json import JSONDecodeError
from fastapi import APIRouter, HTTPException, Request, Response
from passlib.context import CryptContext

from app.services import db
from app.services import auth_db

router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
limiter = get_limiter()
logger = logging.getLogger("epq.auth")

def require_employer(request: Request):
    emp_id = request.session.get("employer_id")
    if not emp_id:
        raise HTTPException(status_code=401, detail="Not logged in")
    emp = db.get_employer(emp_id)
    if not emp:
        request.session.clear()
        raise HTTPException(status_code=401, detail="Session invalid")
    return emp

async def _safe_json(req: Request) -> dict:
    ct = (req.headers.get("content-type") or "").lower()
    if ct and "application/json" not in ct:
        raise HTTPException(status_code=400, detail="Content-Type must be application/json")

    try:
        body = await req.json()
    except JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON body")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not parse JSON body")

    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="JSON body must be an object")

    return body

@router.post("/register")
@limiter.limit("3/hour")
async def register(request: Request, response: Response):
    body = await _safe_json(request)

    company_name = (body.get("company_name") or "").strip() or "unnamed"
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")
    
    # Validate email format
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # Validate password strength (minimum 8 characters)
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    # Redacted email for logging (keep domain for debugging)
    email_parts = email.split("@")
    redacted_email = f"{email_parts[0][:2]}***@{email_parts[1]}" if len(email_parts) == 2 and len(email_parts[0]) > 2 else email

    try:
        existing = auth_db.get_employer_by_email(email)
        if existing:
            logger.info(f"Registration failed - email already exists: {redacted_email}")
            raise HTTPException(
                status_code=409, 
                detail={
                    "code": "EMAIL_TAKEN",
                    "message": "An account already exists for this email address.",
                    "field": "email"
                }
            )

        employer_id = db.create_employer(company_name, email)
        auth_db.set_employer_password(employer_id, pwd_context.hash(password))
        
        # Generate verification token and send email
        verification_token = auth_db.generate_verification_token(employer_id)
        send_verification_email(email, verification_token)

        logger.info(f"Registration successful for: {redacted_email}, employer_id: {employer_id}")
        request.session["employer_id"] = employer_id
        return {
            "status": "ok", 
            "employer_id": employer_id,
            "message": "Registration successful. Please check your email to verify your account."
        }
    except HTTPException:
        raise  # Re-raise HTTP exceptions (like 409 for existing email)
    except Exception as e:
        logger.error(f"Registration failed for {redacted_email}: {e}")
        # Database or other system errors
        error_str = str(e).lower()
        if "no such table" in error_str or ("relation" in error_str and "does not exist" in error_str):
            raise HTTPException(
                status_code=503, 
                detail={
                    "code": "DATABASE_ERROR",
                    "message": "Database not properly configured. Please contact support."
                }
            )
        elif "unique constraint" in error_str or "duplicate key" in error_str:
            # This shouldn't happen since we check above, but just in case
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "EMAIL_TAKEN",
                    "message": "An account already exists for this email address.",
                    "field": "email"
                }
            )
        else:
            raise HTTPException(
                status_code=500, 
                detail={
                    "code": "REGISTRATION_FAILED",
                    "message": "Registration failed. Please try again."
                }
            )

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, response: Response):
    body = await _safe_json(request)

    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""



@router.get("/verify-email")
async def verify_email(req: Request, token: str = None):
    """Verify email address using token from email"""
    if not token:
        raise HTTPException(status_code=400, detail="Verification token required")
    
    employer_id = auth_db.verify_email_token(token)
    
    if not employer_id:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    return {
        "status": "ok",
        "message": "Email verified successfully! You can now access all features."
    }


@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, response: Response):
    """Request password reset email"""
    body = await _safe_json(request)
    email = (body.get("email") or "").strip().lower()
    
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    
    # Always return success to prevent email enumeration
    # Generate token and send email only if email exists
    reset_token = auth_db.generate_reset_token(email)
    if reset_token:
        send_password_reset_email(email, reset_token)
    
    return {
        "status": "ok",
        "message": "If that email exists in our system, a password reset link has been sent."
    }


@router.post("/reset-password")
async def reset_password(req: Request):
    """Reset password using token from email"""
    body = await _safe_json(req)
    token = body.get("token", "").strip()
    new_password = body.get("password", "")
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new password required")
    
    # Validate password strength
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Reset password with token
    password_hash = pwd_context.hash(new_password)
    success = auth_db.reset_password_with_token(token, password_hash)
    
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    return {
        "status": "ok",
        "message": "Password reset successfully. You can now log in with your new password."
    }


@router.get("/resend-verification")
async def resend_verification(req: Request):
    """Resend verification email to logged-in user"""
    emp_id = req.session.get("employer_id")
    if not emp_id:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    emp = db.get_employer(emp_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Employer not found")
    
    # Check if already verified
    employer_data = auth_db.get_employer_by_email(emp["email"])
    if employer_data and employer_data.get("email_verified"):
        return {"status": "ok", "message": "Email already verified"}
    
    # Generate new token and send email
    verification_token = auth_db.generate_verification_token(emp_id)
    send_verification_email(emp["email"], verification_token)
    
    return {
        "status": "ok",
        "message": "Verification email sent. Please check your inbox."
    }


@router.get("/me")
async def get_current_user(req: Request):
    """Get current logged-in user info"""
    emp_id = req.session.get("employer_id")
    if not emp_id:
        raise HTTPException(status_code=401, detail="Not logged in")
    
    emp = db.get_employer(emp_id)
    if not emp:
        req.session.clear()
        raise HTTPException(status_code=401, detail="Session invalid")
    
    employer_data = auth_db.get_employer_by_email(emp["email"])
    
    return {
        "employer_id": emp["employer_id"],
        "company_name": emp["company_name"],
        "email": emp["email"],
        "email_verified": bool(employer_data.get("email_verified")) if employer_data else False
    }
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")

    emp = auth_db.get_employer_by_email(email)
    if not emp or not emp.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not pwd_context.verify(password, emp["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    req.session["employer_id"] = emp["employer_id"]
    return {"status": "ok", "employer_id": emp["employer_id"]}

@router.post("/logout")
async def logout(req: Request):
    req.session.clear()
    return {"status": "ok"}
    # EPQ_WELCOME_EMAIL
    try:
        token = upsert_subscription(email)
        base = (os.getenv("PUBLIC_BASE_URL") or "http://localhost:3000").rstrip("/")
        unsub = f"{base}/email/unsubscribe?token={token}"

        subject = "Welcome to EPQ 🎉"
        html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto; padding: 16px;">
          <h2 style="margin: 0 0 12px 0;">Welcome to EPQ</h2>
          <p style="margin: 0 0 12px 0;">Thanks for signing up. You're officially in.</p>
          <p style="margin: 0 0 12px 0;">
            Create an assessment, share your applicant link, and view submissions + PDFs from your dashboard.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            You're receiving this because you signed up for EPQ.
            <a href="{unsub}">Unsubscribe</a>
          </p>
        </div>
        """
        text = f"Welcome to EPQ. Unsubscribe: {unsub}"

        send_email_gmail_smtp(email, subject, html, text=text)
    except Exception:
        pass

