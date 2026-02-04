# app/routes/calendar.py
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.services.db import get_current_user_from_session, get_db, now_iso
from app.services.scheduling_agent import scheduling_agent

router = APIRouter(prefix="/employer/calendar", tags=["calendar"])

class Interview(BaseModel):
    id: Optional[str] = None
    candidate_name: str
    candidate_id: str
    role_title: str
    start_time: str
    end_time: str
    duration_minutes: int
    location: Optional[str] = None
    meeting_link: Optional[str] = None
    interviewer_names: List[str] = []
    status: str = "scheduled"
    ai_suggested: bool = False
    notes: Optional[str] = None

class ScheduleRequest(BaseModel):
    candidate_id: str
    role_id: str
    preferred_times: List[str] = []
    duration_minutes: int = 60
    interviewer_ids: List[str] = []
    location: Optional[str] = None
    use_ai: bool = True

@router.get("/interviews")
async def get_interviews(
    start: str = Query(...),
    end: str = Query(...),
    user: dict = Depends(get_current_user_from_session)
):
    """Get all interviews within a date range"""
    conn = get_db()
    
    # Check if table exists, create if not
    conn.execute("""
        CREATE TABLE IF NOT EXISTS interviews (
            id TEXT PRIMARY KEY,
            employer_id TEXT NOT NULL,
            candidate_id TEXT NOT NULL,
            candidate_name TEXT NOT NULL,
            role_id TEXT NOT NULL,
            role_title TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            duration_minutes INTEGER NOT NULL,
            location TEXT,
            meeting_link TEXT,
            interviewer_names TEXT,
            status TEXT DEFAULT 'scheduled',
            ai_suggested INTEGER DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    """)
    
    interviews = conn.execute("""
        SELECT * FROM interviews 
        WHERE employer_id = ? 
        AND start_time >= ? 
        AND start_time <= ?
        ORDER BY start_time ASC
    """, [user["user_id"], start, end]).fetchall()
    
    return {
        "interviews": [
            {
                "id": i["id"],
                "candidate_name": i["candidate_name"],
                "candidate_id": i["candidate_id"],
                "role_title": i["role_title"],
                "start_time": i["start_time"],
                "end_time": i["end_time"],
                "duration_minutes": i["duration_minutes"],
                "location": i["location"],
                "meeting_link": i["meeting_link"],
                "interviewer_names": i["interviewer_names"].split(",") if i["interviewer_names"] else [],
                "status": i["status"],
                "ai_suggested": bool(i["ai_suggested"]),
                "notes": i["notes"]
            }
            for i in interviews
        ]
    }

@router.post("/schedule")
async def schedule_interview(
    request: ScheduleRequest,
    user: dict = Depends(get_current_user_from_session)
):
    """Schedule a new interview (with optional AI assistance)"""
    import uuid
    conn = get_db()
    
    # Get candidate info
    candidate = conn.execute(
        "SELECT name FROM applicants WHERE id = ?",
        [request.candidate_id]
    ).fetchone()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Get role info
    role = conn.execute(
        "SELECT title FROM roles WHERE id = ?",
        [request.role_id]
    ).fetchone()
    
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # If AI enabled, suggest optimal time
    if request.use_ai:
        optimal_time = await suggest_optimal_time(
            user["user_id"],
            request.candidate_id,
            request.preferred_times,
            request.duration_minutes
        )
        start_time = optimal_time
        ai_suggested = True
    else:
        start_time = request.preferred_times[0] if request.preferred_times else datetime.now().isoformat()
        ai_suggested = False
    
    # Calculate end time
    start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
    end_dt = start_dt + timedelta(minutes=request.duration_minutes)
    
    interview_id = str(uuid.uuid4())
    
    conn.execute("""
        INSERT INTO interviews (
            id, employer_id, candidate_id, candidate_name,
            role_id, role_title, start_time, end_time,
            duration_minutes, location, meeting_link,
            interviewer_names, status, ai_suggested, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, [
        interview_id, user["user_id"], request.candidate_id, candidate["name"],
        request.role_id, role["title"], start_time, end_dt.isoformat(),
        request.duration_minutes, request.location, None,
        ",".join(request.interviewer_names) if request.interviewer_names else "",
        "scheduled", 1 if ai_suggested else 0, now_iso()
    ])
    
    # Send calendar invite email (placeholder)
    # await send_calendar_invite(candidate["name"], start_time, request.duration_minutes)
    
    return {
        "interview_id": interview_id,
        "start_time": start_time,
        "end_time": end_dt.isoformat(),
        "ai_suggested": ai_suggested
    }

async def suggest_optimal_time(
    employer_id: str,
    candidate_id: str,
    preferred_times: List[str],
    duration_minutes: int
) -> str:
    """AI-powered optimal time suggestion"""
    conn = get_db()
    
    # Get existing interviews to avoid conflicts
    existing = conn.execute("""
        SELECT start_time, end_time FROM interviews
        WHERE employer_id = ? AND status != 'cancelled'
    """, [employer_id]).fetchall()
    
    # Simple algorithm: pick first non-conflicting time
    for pref_time in preferred_times:
        pref_dt = datetime.fromisoformat(pref_time.replace('Z', '+00:00'))
        pref_end = pref_dt + timedelta(minutes=duration_minutes)
        
        has_conflict = False
        for existing_interview in existing:
            ex_start = datetime.fromisoformat(existing_interview["start_time"].replace('Z', '+00:00'))
            ex_end = datetime.fromisoformat(existing_interview["end_time"].replace('Z', '+00:00'))
            
            # Check overlap
            if not (pref_end <= ex_start or pref_dt >= ex_end):
                has_conflict = True
                break
        
        if not has_conflict:
            return pref_time
    
    # If all preferred times conflict, suggest next available slot
    # For now, just return first preferred time or now + 1 day
    if preferred_times:
        return preferred_times[0]
    else:
        return (datetime.now() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0).isoformat()

@router.patch("/interviews/{interview_id}")
async def update_interview(
    interview_id: str,
    status: Optional[str] = None,
    start_time: Optional[str] = None,
    notes: Optional[str] = None,
    user: dict = Depends(get_current_user_from_session)
):
    """Update interview details"""
    conn = get_db()
    
    updates = []
    values = []
    
    if status:
        updates.append("status = ?")
        values.append(status)
    if start_time:
        updates.append("start_time = ?")
        values.append(start_time)
    if notes is not None:
        updates.append("notes = ?")
        values.append(notes)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    values.append(user["user_id"])
    values.append(interview_id)
    
    conn.execute(f"""
        UPDATE interviews 
        SET {', '.join(updates)}
        WHERE employer_id = ? AND id = ?
    """, values)
    
    return {"success": True}

@router.delete("/interviews/{interview_id}")
async def cancel_interview(
    interview_id: str,
    user: dict = Depends(get_current_user_from_session)
):
    """Cancel an interview"""
    conn = get_db()
    
    conn.execute("""
        UPDATE interviews 
        SET status = 'cancelled'
        WHERE employer_id = ? AND id = ?
    """, [user["user_id"], interview_id])
    
    return {"success": True}

@router.get("/availability")
async def get_availability(
    date: str = Query(...),
    user: dict = Depends(get_current_user_from_session)
):
    """Get available time slots for a specific date"""
    conn = get_db()
    
    # Get all interviews for the date
    day_start = datetime.fromisoformat(date).replace(hour=0, minute=0, second=0)
    day_end = day_start + timedelta(days=1)
    
    interviews = conn.execute("""
        SELECT start_time, end_time FROM interviews
        WHERE employer_id = ? 
        AND start_time >= ?
        AND start_time < ?
        AND status != 'cancelled'
        ORDER BY start_time ASC
    """, [user["user_id"], day_start.isoformat(), day_end.isoformat()]).fetchall()
    
    # Business hours: 9 AM to 6 PM
    available_slots = []
    current_time = day_start.replace(hour=9, minute=0)
    end_of_day = day_start.replace(hour=18, minute=0)
    
    for interview in interviews:
        interview_start = datetime.fromisoformat(interview["start_time"].replace('Z', '+00:00'))
        
        if current_time < interview_start:
            available_slots.append({
                "start": current_time.isoformat(),
                "end": interview_start.isoformat()
            })
        
        current_time = datetime.fromisoformat(interview["end_time"].replace('Z', '+00:00'))
    
    # Add remaining time until end of day
    if current_time < end_of_day:
        available_slots.append({
            "start": current_time.isoformat(),
            "end": end_of_day.isoformat()
        })
    
    return {"available_slots": available_slots}

@router.post("/suggest-times")
async def suggest_interview_times(
    candidate_id: str,
    role_id: str,
    duration_minutes: int = 60,
    user: dict = Depends(get_current_user_from_session)
):
    """Get AI-powered interview time suggestions"""
    suggestions = await scheduling_agent.suggest_interview_times(
        employer_id=user["user_id"],
        candidate_id=candidate_id,
        role_id=role_id,
        duration_minutes=duration_minutes,
        num_suggestions=5
    )
    
    return {"suggestions": suggestions}

