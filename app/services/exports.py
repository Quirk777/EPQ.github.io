# app/services/exports.py
"""
Export candidate data to various formats (CSV, JSON).
"""
import csv
import json
import io
from typing import List, Dict
from app.services import db
from app.services.environment_mapper import map_constructs_to_environment
import epq_core

def export_candidates_csv(employer_id: str) -> str:
    """Export all candidates for an employer to CSV format."""
    
    # Get all assessments for employer
    assessments = db.list_assessments_for_employer(employer_id)
    assessment_ids = [a.get("assessment_id") for a in assessments]
    
    # Get all applicants
    candidates = []
    for assessment_id in assessment_ids:
        applicants = db.list_applicants_for_assessment(assessment_id)
        for app in applicants:
            # Calculate environment scores
            candidate_id = app.get("candidate_id")
            try:
                responses_json = db.get_applicant_responses_json(candidate_id)
                if responses_json:
                    responses = json.loads(responses_json)
                    result = epq_core.run_applicant_from_choice_responses(responses)
                    construct_scores = result.get("construct_scores", {})
                    environment = map_constructs_to_environment(construct_scores)
                else:
                    environment = {}
            except:
                environment = {}
            
            candidates.append({
                "candidate_id": candidate_id,
                "name": app.get("applicant_name"),
                "email": app.get("applicant_email"),
                "submitted_at": app.get("submitted_utc"),
                "pdf_status": app.get("pdf_status"),
                "autonomy": environment.get("autonomy", ""),
                "pace": environment.get("pace", ""),
                "structure": environment.get("structure", ""),
                "collaboration": environment.get("collaboration", ""),
                "innovation": environment.get("innovation", ""),
                "ambiguity": environment.get("ambiguity", ""),
            })
    
    # Generate CSV
    output = io.StringIO()
    if candidates:
        fieldnames = ["candidate_id", "name", "email", "submitted_at", "pdf_status", 
                     "autonomy", "pace", "structure", "collaboration", "innovation", "ambiguity"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(candidates)
    
    return output.getvalue()

def export_candidates_json(employer_id: str) -> List[Dict]:
    """Export all candidates for an employer to JSON format."""
    
    # Get all assessments for employer
    assessments = db.list_assessments_for_employer(employer_id)
    assessment_ids = [a.get("assessment_id") for a in assessments]
    
    # Get all applicants with full data
    candidates = []
    for assessment_id in assessment_ids:
        applicants = db.list_applicants_for_assessment(assessment_id)
        for app in applicants:
            candidate_id = app.get("candidate_id")
            
            # Calculate environment scores
            try:
                responses_json = db.get_applicant_responses_json(candidate_id)
                if responses_json:
                    responses = json.loads(responses_json)
                    result = epq_core.run_applicant_from_choice_responses(responses)
                    construct_scores = result.get("construct_scores", {})
                    environment = map_constructs_to_environment(construct_scores)
                    overall_average = result.get("overall_average")
                    overall_band = result.get("overall_band")
                else:
                    environment = {}
                    construct_scores = {}
                    overall_average = None
                    overall_band = None
            except:
                environment = {}
                construct_scores = {}
                overall_average = None
                overall_band = None
            
            candidates.append({
                "candidate_id": candidate_id,
                "name": app.get("applicant_name"),
                "email": app.get("applicant_email"),
                "submitted_at": app.get("submitted_utc"),
                "pdf_status": app.get("pdf_status"),
                "pdf_filename": app.get("pdf_filename"),
                "environment": environment,
                "constructs": construct_scores,
                "overall_average": overall_average,
                "overall_band": overall_band
            })
    
    return candidates

def export_candidate_detail_json(candidate_id: str, employer_id: str) -> Dict:
    """Export a single candidate's full details including collaboration data."""
    
    # Verify ownership
    from app.routes.candidates import conn, calculate_environment_from_responses
    
    with conn() as con:
        cur = con.cursor()
        
        # Get applicant and verify ownership
        cur.execute("""
            SELECT a.candidate_id, a.applicant_name, a.applicant_email, a.submitted_utc,
                   a.pdf_status, a.pdf_filename, a.assessment_id, a.responses_json
            FROM applicants a
            JOIN assessments asm ON a.assessment_id = asm.assessment_id
            WHERE a.candidate_id = ? AND asm.employer_id = ?
        """, (candidate_id, employer_id))
        
        row = cur.fetchone()
        if not row:
            return None
        
        # Get tags
        cur.execute("SELECT tag_id FROM candidate_tags WHERE candidate_id = ?", (candidate_id,))
        tags = [r["tag_id"] for r in cur.fetchall()]
        
        # Get notes
        cur.execute("""
            SELECT author, text, timestamp
            FROM candidate_notes
            WHERE candidate_id = ?
            ORDER BY timestamp DESC
        """, (candidate_id,))
        notes = [dict(r) for r in cur.fetchall()]
        
        # Get feedback
        cur.execute("""
            SELECT category, rating, comment, timestamp
            FROM candidate_feedback
            WHERE candidate_id = ?
            ORDER BY timestamp DESC
        """, (candidate_id,))
        feedback = [dict(r) for r in cur.fetchall()]
    
    # Calculate environment
    environment = calculate_environment_from_responses(candidate_id)
    
    return {
        "candidate_id": candidate_id,
        "name": row["applicant_name"],
        "email": row["applicant_email"],
        "submitted_at": row["submitted_utc"],
        "pdf_status": row["pdf_status"],
        "pdf_filename": row["pdf_filename"],
        "environment": environment,
        "tags": tags,
        "notes": notes,
        "feedback": feedback
    }
