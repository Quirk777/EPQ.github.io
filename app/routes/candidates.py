# app/routes/candidates.py
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional, Dict
import sqlite3
import json
import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = (PROJECT_ROOT / "epq.db").resolve()

router = APIRouter(prefix="/employer/candidates", tags=["candidates"])

def now_iso() -> str:
    return datetime.datetime.utcnow().isoformat()

def conn():
    con = sqlite3.connect(str(DB_PATH))
    con.row_factory = sqlite3.Row
    return con

def get_employer_id(request: Request) -> str:
    try:
        if hasattr(request, "session") and request.session.get("employer_id"):
            return str(request.session["employer_id"])
    except Exception:
        pass
    try:
        if hasattr(request, "state") and getattr(request.state, "employer_id", None):
            return str(request.state.employer_id)
    except Exception:
        pass
    raise HTTPException(status_code=401, detail="Not authenticated")

def calculate_environment_from_responses(candidate_id: str) -> Dict[str, int]:
    """
    Calculate environment scores from candidate's psychometric responses.
    Integrates with epq_core and environment_mapper.
    """
    with conn() as con:
        cur = con.cursor()
        
        # Get applicant's responses_json
        cur.execute("SELECT responses_json FROM applicants WHERE candidate_id = ?", (candidate_id,))
        row = cur.fetchone()
        
        if not row or not row["responses_json"]:
            # Return neutral defaults if no responses
            return {
                "autonomy": 50,
                "pace": 50,
                "structure": 50,
                "collaboration": 50,
                "innovation": 50,
                "ambiguity": 50
            }
        
        try:
            responses = json.loads(row["responses_json"])
            
            # Use epq_core to score responses
            import epq_core
            result = epq_core.run_applicant_from_choice_responses(responses)
            construct_scores = result.get("construct_scores", {})
            
            # Map constructs to environment dimensions
            from app.services.environment_mapper import map_constructs_to_environment
            environment = map_constructs_to_environment(construct_scores)
            
            return environment
            
        except Exception as e:
            print(f"Error calculating environment for {candidate_id}: {e}")
            # Return neutral defaults on error
            return {
                "autonomy": 50,
                "pace": 50,
                "structure": 50,
                "collaboration": 50,
                "innovation": 50,
                "ambiguity": 50
            }

# ============ MODELS ============
class Note(BaseModel):
    author: str
    text: str
    timestamp: Optional[str] = None

class Tag(BaseModel):
    tag_id: str

class FeedbackItem(BaseModel):
    category: str
    rating: int
    comment: str
    timestamp: Optional[str] = None

# ============ ENDPOINTS ============

@router.get("/{candidate_id}")
def get_candidate(candidate_id: str, request: Request):
    """Get full candidate details including psychometric data and environment scores"""
    employer_id = get_employer_id(request)
    
    with conn() as con:
        cur = con.cursor()
        
        # Get applicant basic data
        cur.execute("""
            SELECT a.candidate_id, a.applicant_name, a.applicant_email, a.submitted_utc,
                   a.pdf_status, a.pdf_filename, a.assessment_id
            FROM applicants a
            JOIN assessments asm ON a.assessment_id = asm.assessment_id
            WHERE a.candidate_id = ? AND asm.employer_id = ?
        """, (candidate_id, employer_id))
        
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Try to get psychometric responses (table may not exist or have different schema)
        responses = []
        try:
            cur.execute("""
                SELECT question_id, response_value, response_utc
                FROM applicant_responses
                WHERE candidate_id = ?
                ORDER BY response_utc
            """, (candidate_id,))
            responses = [dict(r) for r in cur.fetchall()]
        except Exception:
            # Table doesn't exist or has different schema - continue without responses
            pass
        
        # Try to calculate environment scores
        environment = {}
        try:
            environment = calculate_environment_from_responses(candidate_id)
        except Exception:
            # Function may fail - provide empty environment
            pass
        
        # Try to get tags (table may not exist)
        tags = []
        try:
            cur.execute("""
                SELECT tag_id
                FROM candidate_tags
                WHERE candidate_id = ?
            """, (candidate_id,))
            tags = [r["tag_id"] for r in cur.fetchall()]
        except Exception:
            pass
        
        # Try to get notes (table may not exist)
        notes = []
        try:
            cur.execute("""
                SELECT author, text, timestamp
                FROM candidate_notes
                WHERE candidate_id = ?
                ORDER BY timestamp DESC
            """, (candidate_id,))
            notes = [dict(r) for r in cur.fetchall()]
        except Exception:
            pass
        
        # Try to get feedback (table may not exist)
        feedback = []
        try:
            cur.execute("""
                SELECT category, rating, comment, timestamp
                FROM candidate_feedback
                WHERE candidate_id = ?
                ORDER BY timestamp DESC
            """, (candidate_id,))
            feedback = [dict(r) for r in cur.fetchall()]
        except Exception:
            pass
        
        return {
            "candidate_id": candidate_id,
            "name": row["applicant_name"],
            "email": row["applicant_email"],
            "submitted_utc": row["submitted_utc"],
            "pdf_status": row["pdf_status"],
            "pdf_filename": row["pdf_filename"],
            "pdf_url": f"/api/employer/pdf/{candidate_id}" if row["pdf_status"] == "success" else None,
            "environment": environment,
            "responses": responses,
            "tags": tags,
            "notes": notes,
            "feedback": feedback
        }

@router.post("/{candidate_id}/tags")
def add_tag(candidate_id: str, tag: Tag, request: Request):
    """Add a tag to a candidate"""
    employer_id = get_employer_id(request)
    
    # Verify candidate belongs to this employer
    with conn() as con:
        cur = con.cursor()
        cur.execute("""
            SELECT 1 FROM applicants a
            JOIN assessments asm ON a.assessment_id = asm.assessment_id
            WHERE a.candidate_id = ? AND asm.employer_id = ?
        """, (candidate_id, employer_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Insert or ignore tag
        try:
            cur.execute("""
                INSERT INTO candidate_tags (candidate_id, tag_id)
                VALUES (?, ?)
            """, (candidate_id, tag.tag_id))
            con.commit()
        except sqlite3.IntegrityError:
            # Tag already exists, that's fine
            pass
    
    return {"success": True, "tag_id": tag.tag_id}

@router.delete("/{candidate_id}/tags/{tag_id}")
def remove_tag(candidate_id: str, tag_id: str, request: Request):
    """Remove a tag from a candidate"""
    employer_id = get_employer_id(request)
    
    with conn() as con:
        cur = con.cursor()
        # Verify ownership
        cur.execute("""
            SELECT 1 FROM applicants a
            JOIN assessments asm ON a.assessment_id = asm.assessment_id
            WHERE a.candidate_id = ? AND asm.employer_id = ?
        """, (candidate_id, employer_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        cur.execute("""
            DELETE FROM candidate_tags
            WHERE candidate_id = ? AND tag_id = ?
        """, (candidate_id, tag_id))
        con.commit()
    
    return {"success": True}

@router.post("/{candidate_id}/notes")
def add_note(candidate_id: str, note: Note, request: Request):
    """Add a note to a candidate"""
    employer_id = get_employer_id(request)
    
    with conn() as con:
        cur = con.cursor()
        # Verify ownership
        cur.execute("""
            SELECT 1 FROM applicants a
            JOIN assessments asm ON a.assessment_id = asm.assessment_id
            WHERE a.candidate_id = ? AND asm.employer_id = ?
        """, (candidate_id, employer_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        timestamp = note.timestamp or now_iso()
        
        cur.execute("""
            INSERT INTO candidate_notes (candidate_id, author, text, timestamp)
            VALUES (?, ?, ?, ?)
        """, (candidate_id, note.author, note.text, timestamp))
        con.commit()
        note_id = cur.lastrowid
    
    return {
        "success": True,
        "note_id": note_id,
        "author": note.author,
        "text": note.text,
        "timestamp": timestamp
    }

@router.post("/{candidate_id}/feedback")
def add_feedback(candidate_id: str, feedback: FeedbackItem, request: Request):
    """Add interview feedback for a candidate"""
    employer_id = get_employer_id(request)
    
    with conn() as con:
        cur = con.cursor()
        # Verify ownership
        cur.execute("""
            SELECT 1 FROM applicants a
            JOIN assessments asm ON a.assessment_id = asm.assessment_id
            WHERE a.candidate_id = ? AND asm.employer_id = ?
        """, (candidate_id, employer_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        timestamp = feedback.timestamp or now_iso()
        
        cur.execute("""
            INSERT INTO candidate_feedback (candidate_id, category, rating, comment, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (candidate_id, feedback.category, feedback.rating, feedback.comment, timestamp))
        con.commit()
        feedback_id = cur.lastrowid
    
    return {
        "success": True,
        "feedback_id": feedback_id,
        "category": feedback.category,
        "rating": feedback.rating,
        "comment": feedback.comment,
        "timestamp": timestamp
    }

@router.get("/{candidate_id}/environment")
def get_candidate_environment(candidate_id: str, request: Request):
    """
    Get candidate's environment scores calculated from their psychometric responses.
    This integrates with epq_core for real calculations.
    """
    employer_id = get_employer_id(request)
    
    with conn() as con:
        cur = con.cursor()
        # Verify ownership
        cur.execute("""
            SELECT 1 FROM applicants a
            JOIN assessments asm ON a.assessment_id = asm.assessment_id
            WHERE a.candidate_id = ? AND asm.employer_id = ?
        """, (candidate_id, employer_id))
        
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        # Get responses
        cur.execute("""
            SELECT question_id, response_value
            FROM applicant_responses
            WHERE candidate_id = ?
            ORDER BY question_id
        """, (candidate_id,))
        
        responses = {r["question_id"]: r["response_value"] for r in cur.fetchall()}
        
        # Calculate environment from responses
        environment = calculate_environment_from_responses(candidate_id)
        
        return {
            "candidate_id": candidate_id,
            "environment": environment,
            "response_count": len(responses)
        }
