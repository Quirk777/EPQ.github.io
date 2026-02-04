"""
Analytics endpoint that reads PDF reports and generates insights
"""
from fastapi import APIRouter, Depends, HTTPException
from pathlib import Path
import json
from typing import Dict, List, Any
from collections import defaultdict

from app.auth import require_employer
from app.services import db

router = APIRouter(prefix="/analytics", tags=["analytics"])

PROJECT_ROOT = Path(__file__).resolve().parents[2]
REPORTS_DIR = PROJECT_ROOT / "reports"

def extract_scores_from_responses(responses_json: str) -> Dict[str, float]:
    """
    Extract construct scores from applicant responses.
    In a real implementation, this would parse the PDF or stored JSON.
    """
    try:
        responses = json.loads(responses_json) if isinstance(responses_json, str) else responses_json
        # Simulate score extraction - in reality, you'd calculate from responses
        # For now, return dummy scores
        return {
            "Structural Clarity": 75.0,
            "Change Volatility": 68.0,
            "Autonomy & Judgment": 82.0,
            "Social Interaction": 71.0,
            "Performance Pressure": 77.0
        }
    except:
        return {}

@router.get("")
def get_analytics(emp=Depends(require_employer)):
    """
    Generate analytics from all applicant submissions.
    Reads PDF metadata and response data to provide insights.
    """
    employer_id = emp.get("employer_id")
    
    # Get all assessments for employer
    assessments = db.list_assessments_for_employer(employer_id)
    
    all_applicants = []
    for assessment in assessments:
        assessment_id = assessment.get("assessment_id")
        if assessment_id:
            applicants = db.list_applicants_for_assessment(assessment_id)
            all_applicants.extend(applicants)
    
    if not all_applicants:
        return {
            "totalSubmissions": 0,
            "averageScore": 0,
            "topConstruct": "N/A",
            "recentTrend": "stable",
            "pdfCount": 0,
            "scoreDistribution": [],
            "constructScores": [],
            "recentActivity": []
        }
    
    # Calculate analytics
    total_submissions = len(all_applicants)
    pdf_count = sum(1 for a in all_applicants if a.get("pdf_status") == "success")
    
    # Analyze construct scores
    construct_totals = defaultdict(lambda: {"sum": 0.0, "count": 0})
    all_scores = []
    
    for applicant in all_applicants:
        responses_json = applicant.get("responses_json", "{}")
        scores = extract_scores_from_responses(responses_json)
        
        if scores:
            # Calculate average score for this applicant
            avg_score = sum(scores.values()) / len(scores)
            all_scores.append(avg_score)
            
            # Aggregate construct scores
            for construct, score in scores.items():
                construct_totals[construct]["sum"] += score
                construct_totals[construct]["count"] += 1
    
    # Calculate average overall score
    avg_score = sum(all_scores) / len(all_scores) if all_scores else 0
    
    # Find top construct
    top_construct = "N/A"
    max_avg = 0
    for construct, data in construct_totals.items():
        if data["count"] > 0:
            avg = data["sum"] / data["count"]
            if avg > max_avg:
                max_avg = avg
                top_construct = construct
    
    # Score distribution
    score_distribution = [
        {"range": "90-100%", "count": sum(1 for s in all_scores if s >= 90), "color": "#10b981"},
        {"range": "80-89%", "count": sum(1 for s in all_scores if 80 <= s < 90), "color": "#06b6d4"},
        {"range": "70-79%", "count": sum(1 for s in all_scores if 70 <= s < 80), "color": "#6366f1"},
        {"range": "60-69%", "count": sum(1 for s in all_scores if 60 <= s < 70), "color": "#f59e0b"},
        {"range": "Below 60%", "count": sum(1 for s in all_scores if s < 60), "color": "#ef4444"}
    ]
    
    # Construct averages
    construct_scores = [
        {
            "name": construct,
            "avg": round(data["sum"] / data["count"], 1) if data["count"] > 0 else 0,
            "trend": "stable"  # In real implementation, compare to historical data
        }
        for construct, data in construct_totals.items()
    ]
    
    # Recent activity (simplified)
    recent_activity = []
    for applicant in sorted(all_applicants, key=lambda x: x.get("submitted_utc", ""), reverse=True)[:5]:
        if applicant.get("pdf_status") == "success":
            recent_activity.append({
                "action": f"PDF generated for {applicant.get('name', 'candidate')}",
                "time": "Recently",
                "color": "#06b6d4"
            })
        else:
            recent_activity.append({
                "action": f"New submission from {applicant.get('name', 'candidate')}",
                "time": "Recently",
                "color": "#10b981"
            })
    
    return {
        "totalSubmissions": total_submissions,
        "averageScore": round(avg_score, 1),
        "topConstruct": top_construct,
        "recentTrend": "up" if len(all_applicants) > 5 else "stable",
        "pdfCount": pdf_count,
        "scoreDistribution": score_distribution,
        "constructScores": construct_scores,
        "recentActivity": recent_activity
    }
