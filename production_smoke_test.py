#!/usr/bin/env python3
"""
EPQ Production Smoke Test Suite
Tests real production URLs for complete functionality
Run: python production_smoke_test.py
"""
import requests
import time
import json
import sys
import os
from typing import Dict, Any

# REPLACE WITH YOUR ACTUAL PRODUCTION URLS
BACKEND_URL = os.environ.get("BACKEND_URL", "https://your-backend-name.up.railway.app")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://your-frontend-name.vercel.app")

# Test credentials - use a real email you can access for verification tests
TEST_EMAIL = os.environ.get("TEST_EMAIL", "your-test@email.com")  
TEST_PASSWORD = "TestPassword123!"
TEST_COMPANY = "Smoke Test Company Ltd"

class SmokeTest:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'EPQ-SmokeTest/1.0'
        })
        
    def test(self, name: str, func) -> bool:
        """Run a test and report results"""
        print(f"🧪 {name:.<40}", end=" ")
        try:
            result = func()
            if result:
                print("✅ PASS")
                return True
            else:
                print("❌ FAIL")
                return False
        except Exception as e:
            print(f"❌ ERROR: {str(e)[:50]}...")
            return False

    def test_health(self) -> bool:
        """Test backend health endpoint"""
        response = self.session.get(f"{BACKEND_URL}/health", timeout=10)
        return response.status_code == 200

    def test_frontend_loads(self) -> bool:
        """Test frontend homepage loads"""
        response = self.session.get(FRONTEND_URL, timeout=10)
        return response.status_code == 200 and len(response.text) > 1000

    def test_cors_headers(self) -> bool:
        """Test CORS configuration"""
        response = self.session.options(
            f"{BACKEND_URL}/auth/login",
            headers={"Origin": FRONTEND_URL}
        )
        cors_header = response.headers.get("Access-Control-Allow-Origin")
        return cors_header == FRONTEND_URL or cors_header == "*"

    def test_signup_flow(self) -> bool:
        """Test complete signup flow"""
        # Use timestamp to make email unique
        unique_email = TEST_EMAIL.replace("@", f"+{int(time.time())}@")
        
        signup_data = {
            "email": unique_email,
            "password": TEST_PASSWORD,
            "company_name": TEST_COMPANY
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/auth/register",
            json=signup_data,
            timeout=10
        )
        
        if response.status_code != 201:
            print(f"[Status: {response.status_code}]", end=" ")
            return False
            
        data = response.json()
        if "employer_id" in data:
            self.employer_id = data["employer_id"]
            self.test_email = unique_email
            return True
        return False

    def test_login_flow(self) -> bool:
        """Test login flow"""
        if not hasattr(self, 'test_email'):
            return False
            
        login_data = {
            "email": self.test_email,
            "password": TEST_PASSWORD
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/auth/login",
            json=login_data,
            timeout=10
        )
        
        if response.status_code != 200:
            print(f"[Status: {response.status_code}]", end=" ")
            return False
            
        # Check if session cookie is set
        has_session = any('session' in cookie.name.lower() for cookie in self.session.cookies)
        return has_session

    def test_create_role(self) -> bool:
        """Test creating an assessment role"""
        role_data = {
            "role_title": f"Test Role {int(time.time())}",
            "role_description": "Automated smoke test role",
            "environment": "collaborative"
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/api/employer/roles",
            json=role_data,
            timeout=10
        )
        
        if response.status_code == 201:
            data = response.json()
            self.role_id = data.get("role_id")
            return True
        
        print(f"[Status: {response.status_code}]", end=" ")
        return False

    def test_email_verification_endpoint(self) -> bool:
        """Test email verification endpoint exists"""
        # Test with dummy token to verify endpoint exists
        response = self.session.get(
            f"{BACKEND_URL}/auth/verify-email?token=dummy-token-test",
            timeout=10
        )
        # Should return 400/401/422, not 404 (endpoint exists)
        return response.status_code in [400, 401, 422]

    def test_password_reset_endpoint(self) -> bool:
        """Test forgot password endpoint"""
        response = self.session.post(
            f"{BACKEND_URL}/api/employer/forgot-password",
            json={"email": self.test_email if hasattr(self, 'test_email') else TEST_EMAIL},
            timeout=10
        )
        return response.status_code in [200, 201]

    def test_create_assessment(self) -> bool:
        """Test creating an assessment"""
        if not hasattr(self, 'role_id'):
            return False
            
        assessment_data = {
            "role_id": self.role_id,
            "environment": "collaborative",
            "max_questions": 20
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/api/employer/assessments",
            json=assessment_data,
            timeout=10
        )
        
        if response.status_code == 201:
            data = response.json()
            self.assessment_id = data.get("assessment_id")
            return True
            
        print(f"[Status: {response.status_code}]", end=" ")
        return False

    def test_get_questions(self) -> bool:
        """Test getting assessment questions"""
        if not hasattr(self, 'assessment_id'):
            return False
            
        response = self.session.get(
            f"{BACKEND_URL}/applicant/{self.assessment_id}/questions",
            timeout=10
        )
        
        if response.status_code == 200:
            questions = response.json()
            self.questions = questions[:5]  # Take first 5
            return len(questions) > 0
            
        return False

    def test_submit_applicant(self) -> bool:
        """Test applicant submission"""
        if not hasattr(self, 'assessment_id') or not hasattr(self, 'questions'):
            return False
        
        # Create sample answers
        answers = {}
        for i, q in enumerate(self.questions):
            answers[q["question_id"]] = {
                "answer": f"This is test answer {i+1} for smoke testing",
                "confidence": 3
            }
        
        # Submit applicant
        submission_data = {
            "applicant_name": f"Test Candidate {int(time.time())}",
            "answers": answers
        }
        
        response = self.session.post(
            f"{BACKEND_URL}/applicant/{self.assessment_id}/submit",
            json=submission_data,
            timeout=15
        )
        
        if response.status_code == 201:
            data = response.json()
            self.candidate_id = data.get("candidate_id")
            return True
            
        print(f"[Status: {response.status_code}]", end=" ")
        return False

    def test_pdf_processing(self) -> bool:
        """Test PDF report processing starts"""
        if not hasattr(self, 'candidate_id'):
            return False
        
        # Check PDF status immediately after submission
        response = self.session.get(
            f"{BACKEND_URL}/applicant/reports/by-candidate/{self.candidate_id}",
            timeout=10
        )
        
        # Should be either processing (202) or ready (200)
        return response.status_code in [200, 202]

    def test_pdf_eventual_success(self) -> bool:
        """Test PDF eventually becomes available"""
        if not hasattr(self, 'candidate_id'):
            return False
            
        # Wait up to 30 seconds for PDF processing
        max_attempts = 6
        for attempt in range(max_attempts):
            response = self.session.get(
                f"{BACKEND_URL}/applicant/reports/by-candidate/{self.candidate_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                # Check if it's actually a PDF
                content_type = response.headers.get('content-type', '')
                if 'application/pdf' in content_type and len(response.content) > 1000:
                    return True
            
            if response.status_code == 202:  # Still processing
                if attempt < max_attempts - 1:  # Don't sleep on last attempt
                    time.sleep(5)
                continue
                
            break
            
        print(f"[Final status: {response.status_code}]", end=" ")
        return False

    def test_dashboard_access(self) -> bool:
        """Test employer dashboard access"""
        response = self.session.get(
            f"{BACKEND_URL}/api/employer/dashboard-data",
            timeout=10
        )
        return response.status_code == 200

    def run_all_tests(self) -> bool:
        """Run complete smoke test suite"""
        print("🚀 EPQ Production Smoke Test Suite")
        print(f"📡 Backend: {BACKEND_URL}")
        print(f"🌐 Frontend: {FRONTEND_URL}")
        print(f"✉️  Test Email: {TEST_EMAIL}")
        print("=" * 60)
        
        tests = [
            ("Backend Health", self.test_health),
            ("Frontend Loads", self.test_frontend_loads), 
            ("CORS Headers", self.test_cors_headers),
            ("User Signup", self.test_signup_flow),
            ("User Login", self.test_login_flow),
            ("Dashboard Access", self.test_dashboard_access),
            ("Email Verification Endpoint", self.test_email_verification_endpoint),
            ("Password Reset Endpoint", self.test_password_reset_endpoint),
            ("Create Role", self.test_create_role),
            ("Create Assessment", self.test_create_assessment),
            ("Get Questions", self.test_get_questions),
            ("Submit Applicant", self.test_submit_applicant),
            ("PDF Processing Starts", self.test_pdf_processing),
            ("PDF Eventually Ready", self.test_pdf_eventual_success),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            if self.test(test_name, test_func):
                passed += 1
            else:
                failed += 1
        
        print("=" * 60)
        print(f"📊 Results: ✅ {passed} passed, ❌ {failed} failed")
        
        if failed == 0:
            print("🎉 All smoke tests PASSED! Your production deployment is working!")
        else:
            print(f"⚠️  {failed} test(s) failed. Check your deployment configuration.")
        
        return failed == 0

if __name__ == "__main__":
    if BACKEND_URL == "https://your-backend-name.up.railway.app":
        print("⚠️  Please update BACKEND_URL and FRONTEND_URL in this script!")
        print("   Or set environment variables:")
        print("   export BACKEND_URL=https://your-actual-backend.up.railway.app")
        print("   export FRONTEND_URL=https://your-actual-frontend.vercel.app") 
        print("   export TEST_EMAIL=your-real@email.com")
        sys.exit(1)
    
    tester = SmokeTest()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)