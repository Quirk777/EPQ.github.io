#!/usr/bin/env python3
"""
Direct PDF generation test - bypasses FastAPI to isolate the issue
"""
import os
import sys
from pathlib import Path

# Set up environment
os.environ["WKHTMLTOPDF_PATH"] = r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe"
sys.path.insert(0, str(Path(__file__).parent))

print("=" * 80)
print("PDF GENERATION DIAGNOSTIC TEST")
print("=" * 80)

# Test 1: Check wkhtmltopdf
print("\n[TEST 1] Checking wkhtmltopdf installation...")
wk_path = os.environ.get("WKHTMLTOPDF_PATH")
print(f"  WKHTMLTOPDF_PATH = {wk_path}")

if wk_path and Path(wk_path).exists():
    print(f"  ✓ File exists at: {wk_path}")
    import subprocess
    try:
        result = subprocess.run([wk_path, "--version"], capture_output=True, text=True, timeout=5)
        print(f"  ✓ Version: {result.stdout.strip()}")
    except Exception as e:
        print(f"  ✗ Version check failed: {e}")
else:
    print(f"  ✗ wkhtmltopdf not found at: {wk_path}")

# Test 2: Check pdfkit
print("\n[TEST 2] Checking pdfkit...")
try:
    import pdfkit
    print("  ✓ pdfkit imported successfully")
    print(f"  pdfkit version: {pdfkit.__version__ if hasattr(pdfkit, '__version__') else 'unknown'}")
except ImportError as e:
    print(f"  ✗ pdfkit import failed: {e}")
    sys.exit(1)

# Test 3: Import report generator
print("\n[TEST 3] Importing report_generator...")
try:
    from report_generator import generate_pdf_report
    print("  ✓ report_generator imported successfully")
except Exception as e:
    print(f"  ✗ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Generate a test PDF
print("\n[TEST 4] Generating test PDF...")
test_result = {
    "construct_scores": {
        "SCL": 2.5,
        "CCD": 3.2,
        "CIL": 2.8,
        "CVL": 3.0,
        "ERL": 2.6,
        "MSD": 2.9,
        "ICI": 3.1,
        "AJL": 2.7
    },
    "overall_average": 2.85,
    "overall_band": "Moderate"
}

output_dir = Path(__file__).parent / "reports"
output_dir.mkdir(exist_ok=True)

try:
    pdf_path = generate_pdf_report(
        applicant_result=test_result,
        employer_environment="moderate",
        candidate_id="TEST-DIAGNOSTIC",
        output_dir=str(output_dir),
        auto_open=False
    )
    
    if pdf_path:
        print(f"  ✓ PDF generated successfully: {pdf_path}")
        if Path(pdf_path).exists():
            size = Path(pdf_path).stat().st_size
            print(f"  ✓ File exists, size: {size:,} bytes")
            if size > 1024:
                print("\n" + "=" * 80)
                print("SUCCESS! PDF generation is working.")
                print("=" * 80)
            else:
                print(f"  ✗ File too small ({size} bytes)")
        else:
            print(f"  ✗ File doesn't exist at reported path")
    else:
        print("  ✗ generate_pdf_report returned None")
        print("\nCheck the output above for error messages from report_generator.py")
        
except Exception as e:
    print(f"  ✗ PDF generation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\nDiagnostic complete.")
