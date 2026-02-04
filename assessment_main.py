#!/usr/bin/env python3

import os
import sys
import shutil
import random
import datetime
import time

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import matplotlib.pyplot as plt

try:
    import pdfkit
    PDFKIT_AVAILABLE = True
except ImportError:
    PDFKIT_AVAILABLE = False

from epq_employer import run_epq_cli
from epq_additional_cli import run as run_applicant_epq
from report_generator import generate_pdf_report


# ------------------------
# Band → environment mapping
# ------------------------
def band_to_environment(band: str) -> str:
    band = band.lower()
    if "core" in band or "lower" in band:
        return "low"
    elif "standard" in band or "flexible" in band:
        return "moderate"
    elif "advanced" in band or "higher" in band:
        return "high"
    return "moderate"


# ------------------------
# Find wkhtmltopdf binary
# ------------------------
def find_wkhtmltopdf():
    for env_name in ("WKHTMLTOPDF_PATH", "WKHTMLTOPDF_BINARY", "WKHTMLTOPDF"):
        env_val = os.environ.get(env_name)
        if env_val and os.path.isfile(env_val):
            return env_val

    binary = shutil.which("wkhtmltopdf")
    if binary:
        return binary

    common_paths = [
        r"C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe",
        r"C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe",
        "/usr/local/bin/wkhtmltopdf",
        "/usr/bin/wkhtmltopdf",
    ]

    for p in common_paths:
        if os.path.isfile(p):
            return p

    return None


# ------------------------
# Candidate ID
# ------------------------
def generate_candidate_id():
    date_part = datetime.datetime.utcnow().strftime("%Y%m%d")
    rand_part = random.randint(1000, 9999)
    return f"A-{date_part}-{rand_part}"


# ------------------------
# Environment → max question mapping
# ------------------------
ENVIRONMENT_TO_MAX_QUESTION = {
    "low": 25,
    "moderate": 32,
    "high": 50
}


# ------------------------
# Main program
# ------------------------
def main():
    print("\n==============================")
    print(" EPQ EMPLOYER → APPLICANT FLOW ")
    print("==============================\n")

    # -------- Employer assessment --------
    print("--- Employer Assessment ---")
    employer_result = run_epq_cli()  # <-- fully interactive, arrow keys

    # -------- Reset terminal for next arrow-key session --------
    print("\033[0m\033[?25h", end="")
    sys.stdout.flush()
    time.sleep(0.2)

    employer_band = employer_result["band"]
    environment = band_to_environment(employer_band)

    print(f"\nEmployer band detected: {employer_band}")
    print(f"Mapped environment: {environment.upper()}")

    # -------- Applicant question cap --------
    max_question_id = ENVIRONMENT_TO_MAX_QUESTION[environment]
    print(f"\nApplicant assessment will run questions 1–{max_question_id}\n")

    # -------- Applicant assessment --------
    print("[DEBUG] Entering applicant assessment...\n")
    applicant_result = run_applicant_epq(max_question_id=max_question_id)
    print("\n[DEBUG] Applicant assessment finished.")

    # -------- Candidate ID --------
    candidate_id = generate_candidate_id()
    print(f"\nCandidate ID: {candidate_id}")

    # -------- PDF generation --------
    wkhtmltopdf_path = find_wkhtmltopdf()
    if wkhtmltopdf_path:
        os.environ["WKHTMLTOPDF_PATH"] = wkhtmltopdf_path

    pdf_path = generate_pdf_report(
        applicant_result,
        employer_environment=environment,
        candidate_id=candidate_id,
        output_dir="."
    )

    print(f"\n✔ Applicant report generated: {pdf_path}")
    print("\nAssessment complete.\n")


if __name__ == "__main__":
    main()
