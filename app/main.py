# app/main.py
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.middleware.sessions import SessionMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from pathlib import Path
import os
from app.routes.debug import router as debug_router
from app.routes import roles, email, calendar, team_fit, analytics_journey, assessment_builder, reference_checks, compliance, talent_pool, attrition, branding
import logging

import epq_core
from report_generator import generate_pdf_report
from app.services import db

from app.auth import router as auth_router
from app.routes.employer import router as employer_router
from app.routes.applicant import router as applicant_router
from app.routes.reports import router as reports_router
from app.routes.analytics import router as analytics_router
from app.routes.candidates import router as candidates_router
from app.routes.webhooks import router as webhooks_router
from app.routes.exports import router as exports_router
from app.routes.bias import router as bias_router
from app.services.rate_limit import get_limiter
from slowapi.errors import RateLimitExceeded


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("epq")

app = FastAPI(title="EPQ Assessment Server (persistent)")

# Rate limiter
limiter = get_limiter()
app.state.limiter = limiter

# Environment detection
ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

# Session configuration
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-only-change-me")

# Validate session secret in production
if IS_PRODUCTION and (SESSION_SECRET == "dev-only-change-me" or len(SESSION_SECRET) < 32):
    raise RuntimeError(
        "CRITICAL: Production environment requires a secure SESSION_SECRET. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

# HTTPS-only cookies in production
https_only_cookies = os.environ.get("HTTPS_ONLY_COOKIES", "false").lower() == "true"
if IS_PRODUCTION and not https_only_cookies:
    logger.warning("Production environment should use HTTPS_ONLY_COOKIES=true")

# HTTPS-only cookies in production
https_only_cookies = os.environ.get("HTTPS_ONLY_COOKIES", "false").lower() == "true"
if IS_PRODUCTION and not https_only_cookies:
    logger.warning("Production environment should use HTTPS_ONLY_COOKIES=true")

# CORS configuration for split deployment
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

# Add production frontend origin (NOT backend URL)
frontend_url = os.environ.get("FRONTEND_URL") or os.environ.get("PUBLIC_BASE_URL")
if frontend_url:
    frontend_url = frontend_url.rstrip("/")
    allowed_origins.append(frontend_url)
    # Add www variant if applicable
    if "www." not in frontend_url and "localhost" not in frontend_url:
        allowed_origins.append(frontend_url.replace("://", "://www."))

# Session configuration with proper SameSite for cross-origin
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site="none" if IS_PRODUCTION else "lax",  # "none" required for cross-origin cookies
    https_only=https_only_cookies,
    max_age=7 * 24 * 60 * 60,  # 7 days
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(debug_router)
app.include_router(auth_router)
app.include_router(employer_router)
app.include_router(applicant_router)
app.include_router(reports_router)
app.include_router(analytics_router, prefix="/employer")
app.include_router(candidates_router)
app.include_router(webhooks_router)
app.include_router(exports_router)
app.include_router(bias_router)
app.include_router(roles.router)
app.include_router(email.router)
app.include_router(calendar.router)
app.include_router(team_fit.router)
app.include_router(analytics_journey.router)
app.include_router(assessment_builder.router)
app.include_router(reference_checks.router)
app.include_router(compliance.router)
app.include_router(talent_pool.router)
app.include_router(attrition.router)
app.include_router(branding.router)

# Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
FRONTEND_DIR = PROJECT_ROOT / "frontend"
REPORTS_DIR = PROJECT_ROOT / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

INDEX_PATH = FRONTEND_DIR / "index.html"

# Optional: mount static frontend folder (not the Next dev server)
if FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")


@app.on_event("startup")
def startup():
    db.init_db()
    logger.info("DB initialized")
    logger.info(f"Environment: {ENVIRONMENT}")
    
    # Log database info
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        logger.info("Database: PostgreSQL (production)")
    else:
        logger.info(f"Database: SQLite at {db.DB_PATH}")


# Error handlers
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded errors"""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "message": "Too many requests. Please try again later."
        },
        headers={"Retry-After": "60"}
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with appropriate JSON responses"""
    # For API routes, return JSON
    if request.url.path.startswith("/api/") or request.url.path.startswith("/auth/"):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail}
        )
    
    # For other routes, you could serve HTML error pages here
    # For now, return JSON for consistency
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    return JSONResponse(
        status_code=400,
        content={
            "error": "Validation error",
            "details": exc.errors()
        }
    )


@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc: Exception):
    """Handle internal server errors"""
    logger.error(f"Internal server error: {exc}", exc_info=True)
    
    # Don't expose internal errors in production
    if IS_PRODUCTION:
        error_message = "Internal server error. Please try again later."
    else:
        error_message = str(exc)
    
    return JSONResponse(
        status_code=500,
        content={"error": error_message}
    )


@app.get("/health")
def health():
    return {"ok": True, "environment": ENVIRONMENT}

@app.get("/health/email")
def health_email():
    """Production email configuration health check - admin only"""
    try:
        from app.email_gmail import _env
        gmail_user = _env("GMAIL_USER")
        app_pw_set = bool(_env("GMAIL_APP_PASSWORD"))
        from_name = _env("GMAIL_FROM_NAME", "EPQ")
        
        config_status = {
            "gmail_user_configured": bool(gmail_user),
            "gmail_app_password_configured": app_pw_set,
            "from_name": from_name,
            "environment": ENVIRONMENT
        }
        
        if not gmail_user or not app_pw_set:
            return JSONResponse(
                status_code=400,
                content={"error": "Email not configured", "config": config_status}
            )
        
        return {"ok": True, "email_configured": True, "config": config_status}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Email health check failed: {str(e)}"}
        )

@app.get("/", response_class=HTMLResponse)
def root():
    return "<h1>EPQ API running</h1><p>Go to <a href='/docs'>/docs</a></p>"


# -------------------------
# Background PDF worker
# -------------------------
from pathlib import Path
import time

# def _generate_pdf_background(assessment_id: str, applicant_result: dict, employer_env: str, candidate_id: str):
#     try:
#         logger.info("Starting PDF generation for assessment %s", assessment_id)

#         reports_dir = Path(REPORTS_DIR).resolve()
#         reports_dir.mkdir(parents=True, exist_ok=True)

#         pdf_path = generate_pdf_report(
#             applicant_result=applicant_result,
#             employer_environment=employer_env,
#             candidate_id=candidate_id,
#             output_dir=str(reports_dir),
#         )

#         if not pdf_path:
#             logger.error("PDF generation returned None for %s", assessment_id)
#             return

#         pdf_file = Path(pdf_path)

#         # If generator returns a relative path, anchor it to reports_dir
#         if not pdf_file.is_absolute():
#             pdf_file = (reports_dir / pdf_file).resolve()
#         else:
#             pdf_file = pdf_file.resolve()

#         logger.info("PDF generator returned path: %s", pdf_file)

#         # Windows can occasionally lag a beat after writing; retry a few times
#         for _ in range(5):
#             if pdf_file.exists() and pdf_file.is_file() and pdf_file.stat().st_size > 0:
#                 break
#             time.sleep(0.25)

#         if not (pdf_file.exists() and pdf_file.is_file()):
#             logger.error("PDF file missing after generation for %s. Expected: %s", assessment_id, pdf_file)
#             return

#         if pdf_file.stat().st_size == 0:
#             logger.error("PDF file is zero bytes for %s. Path: %s", assessment_id, pdf_file)
#             return

#         filename = pdf_file.name

#         # Optional: ensure the file is actually inside REPORTS_DIR
#         try:
#             pdf_file.relative_to(reports_dir)
#         except ValueError:
#             logger.error("PDF was generated outside REPORTS_DIR. pdf=%s reports_dir=%s", pdf_file, reports_dir)
#             return

#         db.set_assessment_pdf(assessment_id, filename)
#         logger.info("PDF saved and DB updated for %s -> %s", assessment_id, filename)

#     except Exception as exc:
#         logger.exception("PDF generation failed for %s: %s", assessment_id, exc)

# # -------------------------
# # Applicant endpoints
# # -------------------------
# @app.get("/applicant/{assessment_id}/questions")
# def get_applicant_questions(assessment_id: str):
#     a = db.get_assessment(assessment_id)
#     if not a:
#         raise HTTPException(status_code=404, detail="Assessment not found")

#     max_q = a.get("max_questions", 32)
#     questions = epq_core.generate_questions(max_q)
#     return {"assessment_id": assessment_id, "max_questions": max_q, "questions": questions}


# @app.post("/applicant/{assessment_id}/submit")
# async def submit_applicant(assessment_id: str, request: Request, background_tasks: BackgroundTasks):
#     a = db.get_assessment(assessment_id)
#     if not a:
#         raise HTTPException(status_code=404, detail="Assessment not found")

#     body = await request.json()
#     responses = body.get("responses", {}) or {}

#     # audit trail
#     try:
#         db.store_applicant_responses(assessment_id, responses)
#     except Exception:
#         logger.exception("Failed to store applicant responses for %s", assessment_id)

#     applicant_result = epq_core.run_applicant_from_responses(responses)
#     candidate_id = f"A-{assessment_id[:8]}"

#     background_tasks.add_task(
#         _generate_pdf_background,
#         assessment_id,
#         applicant_result,
#         a.get("environment", "moderate"),
#         candidate_id,
#     )

#     return {"status": "processing", "candidate_id": candidate_id}
