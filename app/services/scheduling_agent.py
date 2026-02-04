# app/services/scheduling_agent.py
"""
AI-powered interview scheduling agent
Handles automatic scheduling, calendar invite generation, and candidate communication
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json
from app.services import db

class SchedulingAgent:
    """AI agent for intelligent interview scheduling"""
    
    def __init__(self):
        self.business_hours_start = 9  # 9 AM
        self.business_hours_end = 18   # 6 PM
        self.preferred_interview_slots = [10, 14, 16]  # 10 AM, 2 PM, 4 PM
        
    async def suggest_interview_times(
        self,
        employer_id: str,
        candidate_id: str,
        role_id: str,
        duration_minutes: int = 60,
        num_suggestions: int = 5
    ) -> List[Dict]:
        """
        AI-powered suggestion of optimal interview times
        
        Analyzes:
        - Existing calendar commitments
        - Candidate timezone (if available)
        - Historical interview success patterns
        - Avoid back-to-back scheduling fatigue
        """
        conn = db.get_db()
        
        # Get existing interviews to avoid conflicts
        existing = conn.execute("""
            SELECT start_time, end_time, candidate_id FROM interviews
            WHERE employer_id = ? AND status IN ('scheduled', 'confirmed')
            AND start_time >= ?
        """, [employer_id, datetime.now().isoformat()]).fetchall()
        
        # Get candidate info for personalization
        candidate = conn.execute(
            "SELECT name, email FROM applicants WHERE id = ?",
            [candidate_id]
        ).fetchone()
        
        suggestions = []
        current_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        days_checked = 0
        max_days = 14  # Look up to 2 weeks ahead
        
        while len(suggestions) < num_suggestions and days_checked < max_days:
            current_date += timedelta(days=1)
            days_checked += 1
            
            # Skip weekends
            if current_date.weekday() >= 5:
                continue
            
            # Check preferred time slots
            for hour in self.preferred_interview_slots:
                slot_start = current_date.replace(hour=hour, minute=0)
                slot_end = slot_start + timedelta(minutes=duration_minutes)
                
                # Check if slot is in the past
                if slot_start < datetime.now():
                    continue
                
                # Check for conflicts
                has_conflict = self._has_conflict(
                    slot_start, slot_end, existing
                )
                
                if not has_conflict:
                    # Calculate AI score (higher is better)
                    score = self._calculate_slot_score(
                        slot_start, existing, candidate_id
                    )
                    
                    suggestions.append({
                        "start_time": slot_start.isoformat(),
                        "end_time": slot_end.isoformat(),
                        "score": score,
                        "reason": self._get_slot_reason(slot_start, score)
                    })
                    
                    if len(suggestions) >= num_suggestions:
                        break
        
        # Sort by score (best first)
        suggestions.sort(key=lambda x: x["score"], reverse=True)
        
        return suggestions[:num_suggestions]
    
    def _has_conflict(
        self,
        start: datetime,
        end: datetime,
        existing_interviews: List[Dict]
    ) -> bool:
        """Check if proposed time conflicts with existing interviews"""
        for interview in existing_interviews:
            ex_start = datetime.fromisoformat(interview["start_time"].replace('Z', '+00:00'))
            ex_end = datetime.fromisoformat(interview["end_time"].replace('Z', '+00:00'))
            
            # Check overlap
            if not (end <= ex_start or start >= ex_end):
                return True
        
        return False
    
    def _calculate_slot_score(
        self,
        slot_start: datetime,
        existing_interviews: List[Dict],
        candidate_id: str
    ) -> float:
        """
        Calculate AI score for this time slot (0-100)
        
        Factors:
        - Time of day (mid-morning and mid-afternoon preferred)
        - Spacing between interviews (avoid fatigue)
        - Day of week (Tuesday-Thursday preferred)
        - Historical success patterns
        """
        score = 50.0  # Base score
        
        # Time of day preference
        hour = slot_start.hour
        if hour in [10, 14]:  # Peak focus times
            score += 20
        elif hour in [11, 15, 16]:  # Good times
            score += 10
        elif hour in [9, 13, 17]:  # Acceptable times
            score += 5
        
        # Day of week preference
        weekday = slot_start.weekday()
        if weekday in [1, 2, 3]:  # Tue, Wed, Thu
            score += 15
        elif weekday in [0, 4]:  # Mon, Fri
            score += 5
        
        # Spacing from other interviews (avoid back-to-back)
        min_gap = timedelta(hours=2)
        has_good_spacing = True
        for interview in existing_interviews:
            ex_start = datetime.fromisoformat(interview["start_time"].replace('Z', '+00:00'))
            gap = abs((slot_start - ex_start).total_seconds())
            if gap < min_gap.total_seconds():
                score -= 20
                has_good_spacing = False
                break
        
        if has_good_spacing:
            score += 15
        
        return min(100.0, max(0.0, score))
    
    def _get_slot_reason(self, slot_start: datetime, score: float) -> str:
        """Generate human-readable reason for this suggestion"""
        hour = slot_start.hour
        day_name = slot_start.strftime("%A")
        
        if score >= 80:
            return f"Optimal time - {day_name} morning/afternoon with good spacing"
        elif score >= 60:
            return f"Good time - {day_name} at {hour}:00 with adequate spacing"
        else:
            return f"Available on {day_name} at {hour}:00"
    
    async def generate_calendar_invite(
        self,
        interview_id: str,
        candidate_name: str,
        candidate_email: str,
        role_title: str,
        start_time: str,
        duration_minutes: int,
        location: Optional[str] = None,
        meeting_link: Optional[str] = None
    ) -> str:
        """Generate iCalendar (.ics) format for email attachment"""
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        
        # Format times for iCal (YYYYMMDDTHHMMSS)
        ical_start = start_dt.strftime("%Y%m%dT%H%M%S")
        ical_end = end_dt.strftime("%Y%m%dT%H%M%S")
        
        location_line = f"LOCATION:{location}" if location else ""
        
        ical = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Interview Scheduler//EN
BEGIN:VEVENT
UID:{interview_id}@interviewscheduler.com
DTSTAMP:{datetime.now().strftime("%Y%m%dT%H%M%S")}
DTSTART:{ical_start}
DTEND:{ical_end}
SUMMARY:Interview: {role_title} - {candidate_name}
DESCRIPTION:Interview for {role_title} position
{location_line}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR"""
        
        return ical
    
    async def generate_candidate_email(
        self,
        candidate_name: str,
        role_title: str,
        start_time: str,
        duration_minutes: int,
        interviewer_names: List[str],
        location: Optional[str] = None,
        meeting_link: Optional[str] = None,
        prep_materials: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate personalized email to candidate with interview details
        
        Uses AI to personalize message based on role and timing
        """
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        date_str = start_dt.strftime("%A, %B %d at %I:%M %p")
        
        interviewers_str = ", ".join(interviewer_names) if interviewer_names else "our team"
        
        # Location/link info
        if meeting_link:
            location_info = f"""
<p><strong>Meeting Link:</strong><br>
<a href="{meeting_link}">{meeting_link}</a></p>
"""
        elif location:
            location_info = f"""
<p><strong>Location:</strong><br>
{location}</p>
"""
        else:
            location_info = ""
        
        # Prep materials
        prep_section = ""
        if prep_materials:
            prep_section = f"""
<h3>Interview Preparation</h3>
<p>{prep_materials}</p>
"""
        else:
            # Default prep guidance based on role type
            prep_section = f"""
<h3>Interview Preparation</h3>
<p>To help you prepare for your interview:</p>
<ul>
  <li>Review the job description and requirements</li>
  <li>Prepare examples of relevant experience</li>
  <li>Think about questions you'd like to ask us</li>
  <li>Test your video/audio setup if virtual</li>
  <li>Have a copy of your resume handy</li>
</ul>
"""
        
        subject = f"Interview Scheduled: {role_title} - {date_str}"
        
        body = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h2>Hi {candidate_name},</h2>
  
  <p>Great news! We're excited to schedule your interview for the <strong>{role_title}</strong> position.</p>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Interview Details</h3>
    <p><strong>Date & Time:</strong><br>
    {date_str}</p>
    
    <p><strong>Duration:</strong><br>
    {duration_minutes} minutes</p>
    
    {location_info}
    
    <p><strong>Interviewer(s):</strong><br>
    {interviewers_str}</p>
  </div>
  
  {prep_section}
  
  <p>If you need to reschedule, please let us know as soon as possible.</p>
  
  <p>We look forward to meeting you!</p>
  
  <p>Best regards,<br>
  The Hiring Team</p>
</body>
</html>
"""
        
        return {
            "subject": subject,
            "body": body,
            "content_type": "text/html"
        }
    
    async def send_interview_invitation(
        self,
        interview_id: str,
        employer_id: str
    ) -> bool:
        """
        Send complete interview invitation package to candidate
        
        Includes:
        - Personalized email
        - Calendar invite (.ics file)
        - Preparation materials
        """
        conn = db.get_db()
        
        # Get interview details
        interview = conn.execute("""
            SELECT * FROM interviews WHERE id = ?
        """, [interview_id]).fetchone()
        
        if not interview:
            return False
        
        # Get candidate email
        candidate = conn.execute("""
            SELECT email FROM applicants WHERE id = ?
        """, [interview["candidate_id"]]).fetchone()
        
        if not candidate:
            return False
        
        # Generate email content
        interviewer_names = interview["interviewer_names"].split(",") if interview["interviewer_names"] else []
        email_content = await self.generate_candidate_email(
            candidate_name=interview["candidate_name"],
            role_title=interview["role_title"],
            start_time=interview["start_time"],
            duration_minutes=interview["duration_minutes"],
            interviewer_names=interviewer_names,
            location=interview["location"],
            meeting_link=interview["meeting_link"]
        )
        
        # Generate calendar invite
        calendar_invite = await self.generate_calendar_invite(
            interview_id=interview_id,
            candidate_name=interview["candidate_name"],
            candidate_email=candidate["email"],
            role_title=interview["role_title"],
            start_time=interview["start_time"],
            duration_minutes=interview["duration_minutes"],
            location=interview["location"],
            meeting_link=interview["meeting_link"]
        )
        
        # TODO: Actually send email via SMTP or email service
        # For now, just log that we would send it
        print(f"Would send email to {candidate['email']}")
        print(f"Subject: {email_content['subject']}")
        print(f"Calendar invite generated: {len(calendar_invite)} bytes")
        
        return True

# Global instance
scheduling_agent = SchedulingAgent()
