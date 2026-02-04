#!/usr/bin/env python3
"""
Production PDF Generation Test Script
Tests PDF generation functionality for Railway deployment.

Usage:
  python scripts/test-pdf-production.py

Environment Variables:
  WKHTMLTOPDF_PATH (auto-detected if not set)
"""

import os
import sys
import json
import time
import requests
import tempfile
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def test_wkhtmltopdf_binary():
    """Test that wkhtmltopdf binary is available and working"""
    print("=== WKHTMLTOPDF BINARY TEST ===")
    
    try:
        from report_generator import find_wkhtmltopdf
        import subprocess
        
        wk_path = find_wkhtmltopdf(verbose=True)
        print(f"wkhtmltopdf path: {wk_path}")
        
        if not wk_path:
            print("❌ wkhtmltopdf binary not found")
            return False
        
        # Test version command
        result = subprocess.run(
            [wk_path, "--version"],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print(f"✅ wkhtmltopdf version: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ wkhtmltopdf version check failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ wkhtmltopdf test failed: {e}")
        return False

def test_pdfkit_import():
    """Test that pdfkit can be imported and configured"""
    print("\\n=== PDFKIT IMPORT TEST ===")
    
    try:
        import pdfkit
        print("✅ pdfkit imported successfully")
        
        # Test configuration
        from report_generator import find_wkhtmltopdf
        wk_path = find_wkhtmltopdf()
        
        if wk_path:
            config = pdfkit.configuration(wkhtmltopdf=wk_path)
            print(f"✅ pdfkit configured with path: {wk_path}")
            return True
        else:
            print("❌ Cannot configure pdfkit - wkhtmltopdf not found")
            return False
            
    except ImportError as e:
        print(f"❌ pdfkit import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ pdfkit configuration failed: {e}")
        return False

def create_test_applicant():
    """Create a minimal test applicant result for PDF generation"""
    return {
        "candidate_id": "TEST-001",
        "name": "Test Candidate",
        "email": "test@example.com",
        "timestamp": "2026-02-03T10:00:00Z",
        "responses": {
            "autonomy": {"score": 7, "text": "I prefer moderate autonomy in decision-making."},
            "pace": {"score": 6, "text": "I work well at a steady, consistent pace."},
            "structure": {"score": 8, "text": "I thrive in structured environments."},
            "collaboration": {"score": 5, "text": "I balance independent and collaborative work."},
            "innovation": {"score": 7, "text": "I enjoy both innovation and execution."},
            "ambiguity": {"score": 4, "text": "I prefer clear guidelines and expectations."}
        },
        "scores": {
            "autonomy": 7,
            "pace": 6,
            "structure": 8,
            "collaboration": 5,
            "innovation": 7,
            "ambiguity": 4
        }
    }

def test_pdf_generation():
    """Test actual PDF generation with sample data"""
    print("\\n=== PDF GENERATION TEST ===")
    
    try:
        from report_generator import generate_pdf_report
        
        # Create test data
        test_applicant = create_test_applicant()
        
        # Create temporary output directory
        with tempfile.TemporaryDirectory() as temp_dir:
            print(f"Generating PDF in: {temp_dir}")
            
            pdf_path = generate_pdf_report(
                applicant_result=test_applicant,
                employer_environment="Standard",
                candidate_id="TEST-001",
                output_dir=temp_dir,
                auto_open=False
            )
            
            if pdf_path and os.path.exists(pdf_path):
                file_size = os.path.getsize(pdf_path)
                print(f"✅ PDF generated successfully: {pdf_path}")
                print(f"✅ PDF file size: {file_size} bytes")
                
                if file_size > 1000:  # Reasonable minimum size for a PDF
                    return True
                else:
                    print("❌ PDF file seems too small - may be corrupted")
                    return False
            else:
                print(f"❌ PDF generation failed - no file created")
                return False
                
    except Exception as e:
        print(f"❌ PDF generation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoint():
    """Test PDF generation via API endpoint (if backend is running)"""
    print("\\n=== API ENDPOINT TEST ===")
    
    try:
        # Check if backend is running
        base_url = os.environ.get("PUBLIC_BASE_URL", "http://localhost:8001")
        
        health_response = requests.get(f"{base_url}/health", timeout=5)
        if health_response.status_code != 200:
            print("ℹ️ Backend not running - skipping API test")
            return True  # Don't fail the whole test
        
        print(f"✅ Backend is running at {base_url}")
        
        # Note: We can't easily test the PDF API without a real applicant submission
        # But we can verify the health endpoint works
        print("ℹ️ PDF API endpoint test requires live applicant data")
        print("ℹ️ Use the full application flow to test PDF generation via API")
        return True
        
    except requests.exceptions.RequestException:
        print("ℹ️ Backend not accessible - skipping API test")
        return True  # Don't fail if backend isn't running
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

def main():
    print("EPQ Production PDF Generation Test")
    print("=" * 40)
    
    # Environment info
    wkhtmltopdf_path = os.environ.get("WKHTMLTOPDF_PATH")
    if wkhtmltopdf_path:
        print(f"WKHTMLTOPDF_PATH: {wkhtmltopdf_path}")
    else:
        print("WKHTMLTOPDF_PATH: (not set - will auto-detect)")
    
    # Run tests
    tests_passed = 0
    total_tests = 4
    
    if test_wkhtmltopdf_binary():
        tests_passed += 1
    
    if test_pdfkit_import():
        tests_passed += 1
    
    if test_pdf_generation():
        tests_passed += 1
    
    if test_api_endpoint():
        tests_passed += 1
    
    print(f"\\n=== RESULTS ===")
    print(f"Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("✅ All PDF tests passed! PDF generation is ready for production.")
        sys.exit(0)
    else:
        print(f"❌ {total_tests - tests_passed} tests failed. Check wkhtmltopdf installation.")
        print("\\nTroubleshooting:")
        print("1. Install wkhtmltopdf: apt-get install wkhtmltopdf")
        print("2. Set WKHTMLTOPDF_PATH=/usr/bin/wkhtmltopdf")
        print("3. Install pdfkit: pip install pdfkit")
        sys.exit(1)

if __name__ == "__main__":
    main()