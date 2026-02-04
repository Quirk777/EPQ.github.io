#!/usr/bin/env python3
"""
Production Email Verification Script
Tests email verification and password reset functionality.

Usage:
  python scripts/verify-email-production.py

Environment Variables Required:
  GMAIL_USER=your-gmail@example.com
  GMAIL_APP_PASSWORD=your-16-char-app-password  
  PUBLIC_BASE_URL=https://your-domain.com
"""

import os
import sys
import time
import requests
from urllib.parse import parse_qs, urlparse

def get_base_url():
    """Get base URL from environment or default to localhost"""
    base_url = os.environ.get("PUBLIC_BASE_URL", "http://localhost:8001")
    return base_url.rstrip("/")

def test_email_health():
    """Test /health/email endpoint"""
    base_url = get_base_url()
    
    print("=== EMAIL HEALTH CHECK ===")
    try:
        response = requests.get(f"{base_url}/health/email", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ Email configuration is healthy")
            return True
        else:
            print("❌ Email configuration has issues")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def create_test_employer(email="test-employer@example.com", company="TestCorp"):
    """Create a test employer account to verify email functionality"""
    base_url = get_base_url()
    
    print(f"\\n=== CREATING TEST EMPLOYER: {email} ===")
    
    data = {
        "company_name": company,
        "email": email,
        "password": "TestPass123!",
        "confirm_password": "TestPass123!"
    }
    
    try:
        response = requests.post(f"{base_url}/api/employer/signup", json=data, timeout=10)
        print(f"Signup Status: {response.status_code}")
        result = response.json()
        print(f"Response: {result}")
        
        if response.status_code in [200, 201]:
            print("✅ Employer account created successfully")
            return True
        elif response.status_code == 400 and "already exists" in str(result):
            print("ℹ️ Employer already exists (this is OK for testing)")
            return True
        else:
            print(f"❌ Failed to create employer: {result}")
            return False
    except Exception as e:
        print(f"❌ Signup failed: {e}")
        return False

def trigger_password_reset(email="test-employer@example.com"):
    """Trigger password reset to test email delivery"""
    base_url = get_base_url()
    
    print(f"\\n=== PASSWORD RESET TEST: {email} ===")
    
    try:
        response = requests.post(
            f"{base_url}/api/employer/forgot-password",
            json={"email": email},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {result}")
        
        if response.status_code == 200:
            print("✅ Password reset email should be sent")
            print(f"ℹ️ Check {email} for reset email")
            return True
        else:
            print(f"❌ Password reset failed: {result}")
            return False
    except Exception as e:
        print(f"❌ Password reset request failed: {e}")
        return False

def verify_url_structure():
    """Verify that PUBLIC_BASE_URL is properly configured"""
    base_url = get_base_url()
    public_base_url = os.environ.get("PUBLIC_BASE_URL", "")
    
    print(f"\\n=== URL CONFIGURATION ===")
    print(f"Base URL: {base_url}")
    print(f"PUBLIC_BASE_URL env var: {public_base_url}")
    
    if not public_base_url:
        print("⚠️ PUBLIC_BASE_URL not set - email links may not work in production")
        return False
    
    if public_base_url.startswith("http://localhost") or public_base_url.startswith("http://127.0.0.1"):
        print("⚠️ PUBLIC_BASE_URL points to localhost - this won't work in production")
        return False
    
    if not public_base_url.startswith("https://"):
        print("⚠️ PUBLIC_BASE_URL should use HTTPS in production")
        return False
    
    print("✅ URL configuration looks good for production")
    return True

def main():
    print("EPQ Production Email Verification")
    print("=" * 40)
    
    # Check environment variables
    gmail_user = os.environ.get("GMAIL_USER")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD")
    
    if not gmail_user:
        print("❌ GMAIL_USER environment variable not set")
        sys.exit(1)
    
    if not gmail_password:
        print("❌ GMAIL_APP_PASSWORD environment variable not set")
        sys.exit(1)
    
    print(f"Gmail User: {gmail_user}")
    print(f"Gmail App Password: {'*' * len(gmail_password)}")
    
    # Run tests
    tests_passed = 0
    total_tests = 4
    
    if verify_url_structure():
        tests_passed += 1
    
    if test_email_health():
        tests_passed += 1
    
    if create_test_employer():
        tests_passed += 1
    
    if trigger_password_reset():
        tests_passed += 1
    
    print(f"\\n=== RESULTS ===")
    print(f"Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("✅ All email tests passed! Email is ready for production.")
        sys.exit(0)
    else:
        print(f"❌ {total_tests - tests_passed} tests failed. Check configuration.")
        sys.exit(1)

if __name__ == "__main__":
    main()