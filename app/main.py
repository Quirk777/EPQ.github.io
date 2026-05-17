# app/main.py
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi import Header
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.middleware.sessions import SessionMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from pathlib import Path
import os
from app.routes.debug import router as debug_router
from app.routes import roles, email, calendar, team_fit, analytics_journey, assessment_builder, reference_checks, compliance, talent_pool, attrition, branding
import logging

import epq_core
from report_generator import generate_pdf_report
from app.services import db
from app.services import db_adapter

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

app = FastAPI(title="EPQ Assessment Server")

# Rate limiter
limiter = get_limiter()
app.state.limiter = limiter

# Environment detection
ENVIRONMENT = (os.environ.get("ENVIRONMENT", "development") or "development").strip().lower()
IS_PRODUCTION = ENVIRONMENT == "production"
PUBLIC_BASE_URL = (os.environ.get("PUBLIC_BASE_URL") or os.environ.get("FRONTEND_URL") or "").rstrip("/")

# Session configuration
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-only-change-me")

# Validate session secret in production
if IS_PRODUCTION and (SESSION_SECRET == "dev-only-change-me" or len(SESSION_SECRET) < 32):
    raise RuntimeError(
        "CRITICAL: Production environment requires a secure SESSION_SECRET. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

session_cookie_secure = os.environ.get("HTTPS_ONLY_COOKIES", "true" if IS_PRODUCTION else "false").lower() == "true"
session_same_site = (os.environ.get("SESSION_SAME_SITE", "lax") or "lax").strip().lower()
if session_same_site not in {"lax", "strict", "none"}:
    session_same_site = "lax"
if session_same_site == "none" and not session_cookie_secure:
    raise RuntimeError("SESSION_SAME_SITE=none requires HTTPS_ONLY_COOKIES=true")

trusted_proxy_ips = os.environ.get("TRUSTED_PROXY_IPS")
if IS_PRODUCTION and (not trusted_proxy_ips or trusted_proxy_ips.strip() == "*"):
    raise RuntimeError(
        "CRITICAL: Production requires TRUSTED_PROXY_IPS to be explicitly set "
        "to your reverse proxy IP(s) or CIDR(s). Do not use '*'."
    )

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=(trusted_proxy_ips or "*"))

# CORS configuration
cors_origins_env = os.environ.get("CORS_ALLOW_ORIGINS", "").strip()
if cors_origins_env:
    allowed_origins = [item.strip().rstrip("/") for item in cors_origins_env.split(",") if item.strip()]
else:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

if PUBLIC_BASE_URL:
    allowed_origins.append(PUBLIC_BASE_URL)
    # Add www variant if applicable
    if "www." not in PUBLIC_BASE_URL and "localhost" not in PUBLIC_BASE_URL:
        allowed_origins.append(PUBLIC_BASE_URL.replace("://", "://www."))

allowed_origins = list(dict.fromkeys(allowed_origins))

# Session configuration
app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    same_site=session_same_site,
    https_only=session_cookie_secure,
    session_cookie=os.environ.get("SESSION_COOKIE_NAME", "epq_session"),
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
if not IS_PRODUCTION:
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
REPORTS_DIR = Path(os.environ.get("REPORTS_DIR") or (PROJECT_ROOT / "reports")).expanduser().resolve()
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

INDEX_PATH = FRONTEND_DIR / "index.html"

# Optional: mount static frontend folder (not the Next dev server)
if FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")


@app.on_event("startup")
def startup():
    try:
        db.init_db()
        logger.info("DB initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        if IS_PRODUCTION:
            raise RuntimeError("Database connection required in production")
    
    logger.info("Environment: %s", ENVIRONMENT)
    logger.info("Public base URL: %s", PUBLIC_BASE_URL or "(not set)")
    logger.info("Session secure cookies: %s", session_cookie_secure)
    logger.info("Session same-site: %s", session_same_site)
    logger.info("Trusted proxy IPs: %s", trusted_proxy_ips)
    logger.info("Database: %s", db_adapter.database_label())
    if not db_adapter.is_postgres():
        logger.info("Database path: %s", db.DB_PATH)
    logger.info("Reports directory: %s", REPORTS_DIR)
    logger.info("wkhtmltopdf path: %s", os.environ.get("WKHTMLTOPDF_PATH", "(auto-detect)"))


# Health check endpoints
@app.get("/health/db")
def health_check_db():
    """Database connectivity health check"""
    try:
        con = db.connect()
        cur = con.cursor()
        cur.execute("SELECT 1")
        
        result = cur.fetchone()
        con.close()
        
        if result:
            return {
                "status": "healthy",
                "database": db_adapter.database_label(),
                "connection": "OK"
            }
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return JSONResponse(
            status_code=503,
            content={
                "status": "unhealthy", 
                "database": db_adapter.database_label(),
                "error": "Database connection failed",
                "message": "DB not configured properly. Check DATABASE_URL or DB_PATH/SQLITE_PATH."
            }
        )


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


@app.get("/healthz")
def healthz():
    return {
        "status": "ok",
        "service": "backend",
        "environment": ENVIRONMENT,
    }

@app.get("/health/email")
def health_email(x_health_token: str | None = Header(default=None)):
    """Production email configuration health check - admin only"""
    if IS_PRODUCTION:
        expected = os.environ.get("HEALTH_EMAIL_TOKEN")
        if not expected or x_health_token != expected:
            # Hide existence to reduce probing.
            raise HTTPException(status_code=404, detail="Not Found")

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

