#!/usr/bin/env python3
"""Test script to simulate the background PDF generation task"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services import db
from app.routes.applicant import _generate_pdf_background

# Test with the most recent candidate
candidate_id = "A-ca074ed0-0fe306"
assessment_id = "test_assessment"
applicant_result = {"test": "data"}
employer_env = "moderate"

print(f"Testing background task for candidate: {candidate_id}")
print(f"Current status before task:")

import sqlite3
conn = sqlite3.connect('epq.db')
cursor = conn.cursor()
cursor.execute('SELECT pdf_status, pdf_filename FROM applicants WHERE candidate_id = ?', (candidate_id,))
row = cursor.fetchone()
print(f"  Status: {row[0]}, File: {row[1]}")
conn.close()

# Reset to processing
print(f"\nResetting to 'processing' status...")
db.update_applicant_pdf_status(candidate_id, "processing", "")

# Run the background task
print(f"\nRunning background task...")
try:
    _generate_pdf_background(assessment_id, applicant_result, employer_env, candidate_id)
    print("Background task completed!")
except Exception as e:
    print(f"Background task failed: {e}")
    import traceback
    traceback.print_exc()

# Check final status
print(f"\nFinal status:")
conn = sqlite3.connect('epq.db')
cursor = conn.cursor()
cursor.execute('SELECT pdf_status, pdf_filename, pdf_error FROM applicants WHERE candidate_id = ?', (candidate_id,))
row = cursor.fetchone()
print(f"  Status: {row[0]}")
print(f"  File: {row[1]}")
print(f"  Error: {row[2]}")
conn.close()
