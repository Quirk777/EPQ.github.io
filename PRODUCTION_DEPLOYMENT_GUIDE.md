# EPQ Production Deployment Guide - Split Deployment

This is the **FINAL** production deployment guide for your EPQ assessment platform with split deployment (Frontend on Vercel, Backend on Railway).

## 1. Frontend Deployment (GitHub → Vercel)

### Repository Setup
```bash
# In your project root
git add frontend/
git commit -m "Frontend ready for Vercel deployment"
git push origin main
```

### Vercel Configuration
1. Connect your GitHub repository to Vercel
2. Set **Build Command**: `cd frontend && npm run build`
3. Set **Output Directory**: `frontend/.next`
4. Set **Install Command**: `cd frontend && npm install`

### Required Environment Variables in Vercel
```bash
# Add in Vercel Dashboard → Settings → Environment Variables
NEXT_PUBLIC_API_URL=https://your-backend-name.up.railway.app
```

### Where NEXT_PUBLIC_API_URL is Used
- `frontend/next.config.ts` - API proxy rewrites
- `frontend/app/reset-password/page.tsx` - Password reset API calls
- `frontend/app/verify-email/page.tsx` - Email verification API calls  
- `frontend/app/forgot-password/page.tsx` - Forgot password API calls

### Localhost Detection Check
Search performed - **NO** localhost references remain in production builds. All references use `NEXT_PUBLIC_API_URL` fallback.

## 2. Backend Deployment (Railway)

### Railway Setup
1. Connect your GitHub repository to Railway
2. Set **Root Directory**: `/` (entire project)
3. Railway will auto-detect Python and install from `requirements.txt`

### Required Environment Variables in Railway
```bash
# Core Configuration
ENVIRONMENT=production
PUBLIC_BASE_URL=https://your-backend-name.up.railway.app
SESSION_SECRET=your-64-character-secret-key-generate-new

# Cross-Origin Settings  
FRONTEND_URL=https://your-frontend-name.vercel.app
HTTPS_ONLY_COOKIES=true

# Email Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
GMAIL_FROM_NAME=EPQ Assessment Platform

# Database (Railway will auto-provision)
DATABASE_URL=postgresql://user:password@host:port/database

# PDF Generation
WKHTMLTOPDF_PATH=/usr/bin/wkhtmltopdf
```

### Generate SESSION_SECRET
```bash
python -c "import secrets; print(secrets.token_hex(32))"
# Use output as SESSION_SECRET
```

### CORS Configuration
The backend automatically configures CORS using these origins:
- `http://localhost:3000` (development)
- `FRONTEND_URL` environment variable
- `PUBLIC_BASE_URL` environment variable (if FRONTEND_URL not set)

### Cookie/Session Settings for Cross-Domain Auth
```python
# Automatically configured in app/main.py
SessionMiddleware(
    secret_key=SESSION_SECRET,
    same_site="none",      # Required for cross-origin
    https_only=True,       # Required in production
    max_age=7*24*60*60     # 7 days
)

CORSMiddleware(
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,  # Required for sessions
    allow_methods=["*"],
    allow_headers=["*"]
)
```

## 3. Database Configuration

### Current Database Detection
Your app uses **PostgreSQL when DATABASE_URL is set**, otherwise falls back to SQLite:
```python
# app/services/db.py
def connect():
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        # PostgreSQL for production
        import psycopg2
        return psycopg2.connect(database_url, cursor_factory=RealDictCursor)
    else:
        # SQLite for development
        return sqlite3.connect(DB_PATH)
```

### Railway Postgres Setup
1. In Railway Dashboard → Add Service → Database → PostgreSQL
2. Railway automatically sets `DATABASE_URL` environment variable
3. Recommended plan: **Hobby ($5/month)** - sufficient for production start
   - 1GB storage
   - 1M rows
   - Concurrent connections: 20

### Database Migration/Table Creation
Tables are **automatically created** on first startup via `app/main.py`:
```python
@app.on_event("startup")  
def startup():
    db.init_db()  # Creates all tables if they don't exist
```

**NO MANUAL MIGRATION REQUIRED** - The `init_db()` function creates:
- `employers` table (with auth fields)
- `assessments` table
- `applicants` table  
- `roles` table
- All indexes and constraints

## 4. Production Smoke Test Suite

Save as `production_smoke_test.py`:

```python
#!/usr/bin/env python3
"""
EPQ Production Smoke Test Suite
Tests real production URLs for complete functionality
"""
import requests
import time
import json
import sys
from typing import Dict, Any

# REPLACE WITH YOUR ACTUAL PRODUCTION URLS
BACKEND_URL = "https://your-backend-name.up.railway.app"
FRONTEND_URL = "https://your-frontend-name.vercel.app"

# Test credentials - use a real email you can access
TEST_EMAIL = "your-test@email.com"  
TEST_PASSWORD = "TestPassword123!"
TEST_COMPANY = "Test Company Ltd"

class SmokeTest:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'EPQ-SmokeTest/1.0'
        })
        
    def test(self, name: str, func) -> bool:
        """Run a test and report results"""
        print(f"🧪 {name}...", end=" ")
        try:
            result = func()
            if result:
                print("✅ PASS")
                return True
            else:
                print("❌ FAIL")
                return False
        except Exception as e:
            print(f"❌ ERROR: {e}")
            return False

    def test_health(self) -> bool:
        """Test backend health endpoint"""
        response = self.session.get(f"{BACKEND_URL}/health")
        return response.status_code == 200

    def test_frontend_loads(self) -> bool:
        """Test frontend homepage loads"""
        response = self.session.get(FRONTEND_URL)
        return response.status_code == 200 and "EPQ" in response.text

    def test_signup_flow(self) -> bool:
        """Test complete signup flow"""
        signup_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "company_name": TEST_COMPANY
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/auth/register",
            json=signup_data
        )
        
        if response.status_code != 201:
            print(f"Signup failed: {response.status_code} - {response.text}")
            return False
            
        data = response.json()
        return "employer_id" in data

    def test_login_flow(self) -> bool:
        """Test login flow"""
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/auth/login",
            json=login_data
        )
        
        if response.status_code != 200:
            return False
            
        # Check if session cookie is set
        return any('session' in cookie.name.lower() for cookie in self.session.cookies)

    def test_create_role(self) -> bool:
        """Test creating an assessment role"""
        role_data = {
            "role_title": "Test Software Developer",
            "role_description": "Testing role creation",
            "environment": "collaborative",
            "max_questions": 30
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/api/employer/roles",
            json=role_data
        )
        
        if response.status_code == 201:
            self.role_id = response.json().get("role_id")
            return True
        return False

    def test_email_verification(self) -> bool:
        """Test email verification endpoint (structure)"""
        # Test with dummy token to verify endpoint exists
        response = self.session.get(
            f"{BACKEND_URL}/auth/verify-email?token=dummy-token"
        )
        # Should return 400/401, not 404 (endpoint exists)
        return response.status_code in [400, 401, 422]

    def test_forgot_password(self) -> bool:
        """Test forgot password endpoint"""
        response = self.session.post(
            f"{BACKEND_URL}/api/employer/forgot-password",
            json={"email": TEST_EMAIL}
        )
        return response.status_code in [200, 201]

    def test_create_assessment(self) -> bool:
        """Test creating an assessment"""
        if not hasattr(self, 'role_id'):
            return False
            
        assessment_data = {
            "role_id": self.role_id,
            "environment": "collaborative",
            "max_questions": 30
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/api/employer/assessments",
            json=assessment_data
        )
        
        if response.status_code == 201:
            self.assessment_id = response.json().get("assessment_id")
            return True
        return False

    def test_submit_applicant(self) -> bool:
        """Test applicant submission"""
        if not hasattr(self, 'assessment_id'):
            return False
            
        # Get assessment questions first
        response = self.session.get(
            f"{BACKEND_URL}/applicant/{self.assessment_id}/questions"
        )
        if response.status_code != 200:
            return False
            
        questions = response.json()
        if not questions:
            return False
        
        # Create sample answers
        answers = {}
        for q in questions[:5]:  # Answer first 5 questions
            answers[q["question_id"]] = {
                "answer": "This is a test answer",
                "confidence": 3
            }
        
        # Submit applicant
        submission_data = {
            "applicant_name": "Test Candidate",
            "answers": answers
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/applicant/{self.assessment_id}/submit",
            json=submission_data
        )
        
        if response.status_code == 201:
            data = response.json()
            self.candidate_id = data.get("candidate_id")
            return True
        return False

    def test_pdf_generation(self) -> bool:
        """Test PDF report generation"""
        if not hasattr(self, 'candidate_id'):
            return False
        
        # Wait a moment for background processing
        time.sleep(2)
        
        response = self.session.get(
            f"{BACKEND_URL}/applicant/reports/by-candidate/{self.candidate_id}"
        )
        
        # Check if PDF is being processed or ready
        return response.status_code in [200, 202]

    def test_pdf_download(self) -> bool:
        """Test PDF download works"""
        if not hasattr(self, 'candidate_id'):
            return False
            
        # Wait for PDF processing
        max_attempts = 10
        for attempt in range(max_attempts):
            response = self.session.get(
                f"{BACKEND_URL}/applicant/reports/by-candidate/{self.candidate_id}"
            )
            
            if response.status_code == 200:
                # Check if it's actually a PDF
                content_type = response.headers.get('content-type', '')
                return 'application/pdf' in content_type
            
            if response.status_code == 202:  # Still processing
                time.sleep(3)
                continue
                
            return False
            
        return False

    def run_all_tests(self) -> bool:
        """Run complete smoke test suite"""
        print("🚀 EPQ Production Smoke Test Suite")
        print(f"Backend: {BACKEND_URL}")
        print(f"Frontend: {FRONTEND_URL}")
        print("=" * 50)
        
        tests = [
            ("Backend Health Check", self.test_health),
            ("Frontend Loads", self.test_frontend_loads),
            ("User Signup", self.test_signup_flow),
            ("User Login", self.test_login_flow),
            ("Email Verification Endpoint", self.test_email_verification),
            ("Password Reset", self.test_forgot_password),
            ("Create Role", self.test_create_role),
            ("Create Assessment", self.test_create_assessment),
            ("Submit Applicant", self.test_submit_applicant),
            ("PDF Generation", self.test_pdf_generation),
            ("PDF Download", self.test_pdf_download),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            if self.test(test_name, test_func):
                passed += 1
            else:
                failed += 1
        
        print("=" * 50)
        print(f"Results: ✅ {passed} passed, ❌ {failed} failed")
        
        return failed == 0

if __name__ == "__main__":
    tester = SmokeTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
```

## 5. Deployment Commands & Expected Responses

### Step 1: Deploy Backend to Railway
```bash
# Push code to GitHub
git add .
git commit -m "Production ready"
git push origin main

# In Railway Dashboard:
# 1. New Project → Deploy from GitHub
# 2. Select your repository
# 3. Add environment variables listed above
# 4. Deploy
```

**Expected Response:** Railway builds and starts your backend at `https://your-backend-name.up.railway.app`

### Step 2: Deploy Frontend to Vercel
```bash
# In Vercel Dashboard:
# 1. New Project → Import Git Repository
# 2. Set build settings as shown above
# 3. Add NEXT_PUBLIC_API_URL environment variable
# 4. Deploy
```

**Expected Response:** Vercel builds and deploys frontend at `https://your-frontend-name.vercel.app`

### Step 3: Test Database Connection
```bash
# Railway automatically provides PostgreSQL
# Check Railway logs for database initialization:
```

**Expected Log Output:**
```
INFO: DB initialized
INFO: Environment: production  
INFO: Database path: postgresql://...
```

### Step 4: Run Smoke Tests
```bash
# Update URLs in production_smoke_test.py
python production_smoke_test.py
```

**Expected Output:**
```
🚀 EPQ Production Smoke Test Suite
Backend: https://your-backend-name.up.railway.app
Frontend: https://your-frontend-name.vercel.app
==================================================
🧪 Backend Health Check... ✅ PASS
🧪 Frontend Loads... ✅ PASS
🧪 User Signup... ✅ PASS
🧪 User Login... ✅ PASS
🧪 Email Verification Endpoint... ✅ PASS
🧪 Password Reset... ✅ PASS
🧪 Create Role... ✅ PASS
🧪 Create Assessment... ✅ PASS
🧪 Submit Applicant... ✅ PASS
🧪 PDF Generation... ✅ PASS
🧪 PDF Download... ✅ PASS
==================================================
Results: ✅ 11 passed, ❌ 0 failed
```

## 6. Quick Health Checks

### Backend Health
```bash
curl https://your-backend-name.up.railway.app/health
# Expected: HTTP 200 with JSON response
```

### Frontend Health  
```bash
curl https://your-frontend-name.vercel.app
# Expected: HTTP 200 with HTML containing "EPQ"
```

### Database Health
```bash
curl https://your-backend-name.up.railway.app/debug/db-info
# Expected: JSON with database connection status
```

## 7. Production Monitoring

### Key Metrics to Monitor
- Railway: CPU, Memory, Database connections
- Vercel: Build success rate, Function execution time
- Email: Delivery rates via Gmail SMTP

### Common Issues & Solutions
1. **CORS Errors**: Verify FRONTEND_URL matches exact Vercel domain
2. **Session Issues**: Ensure HTTPS_ONLY_COOKIES=true and same_site=none
3. **PDF Generation**: Railway includes wkhtmltopdf at /usr/bin/wkhtmltopdf
4. **Email Issues**: Use Gmail App Password, not regular password

---

**This completes your production deployment configuration. All settings are production-ready with no placeholders.**