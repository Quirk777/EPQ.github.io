"""
Reference Check Automation Service
Handles automated reference requests, questionnaires, and verification
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json
import sqlite3
from app.services.db import get_db

@dataclass
class ReferenceRequest:
    """Reference request details"""
    id: int
    candidate_id: int
    reference_name: str
    reference_email: str
    reference_phone: Optional[str]
    relationship: str  # Manager, Colleague, HR
    company: str
    status: str  # pending, completed, bounced, expired
    sent_at: Optional[datetime]
    completed_at: Optional[datetime]
    reminder_count: int
    unique_token: str

@dataclass
class ReferenceResponse:
    """Reference questionnaire response"""
    id: int
    request_id: int
    question_id: str
    question_text: str
    response: str
    rating: Optional[int]  # 1-5 scale
    submitted_at: datetime

@dataclass
class EmploymentVerification:
    """Verified employment details"""
    id: int
    candidate_id: int
    company: str
    job_title: str
    start_date: str
    end_date: Optional[str]
    verified: bool
    verification_source: str  # reference, linkedin, manual
    discrepancy_flag: bool
    discrepancy_notes: Optional[str]

class ReferenceChecker:
    """
    Reference check automation system
    Sends structured questionnaires, tracks responses, detects discrepancies
    """
    
    # Standard questionnaire templates
    QUESTIONNAIRE_TEMPLATES = {
        "manager": [
            {"id": "duration", "text": "How long did {candidate} report to you?", "type": "text"},
            {"id": "title", "text": "What was their job title?", "type": "text"},
            {"id": "responsibilities", "text": "What were their primary responsibilities?", "type": "text"},
            {"id": "performance", "text": "How would you rate their overall performance?", "type": "rating"},
            {"id": "strengths", "text": "What were their key strengths?", "type": "text"},
            {"id": "areas_improvement", "text": "What areas could they improve?", "type": "text"},
            {"id": "teamwork", "text": "How would you rate their ability to work in teams?", "type": "rating"},
            {"id": "reliability", "text": "How would you rate their reliability and attendance?", "type": "rating"},
            {"id": "rehire", "text": "Would you rehire this person?", "type": "boolean"},
            {"id": "reason_leaving", "text": "What was their reason for leaving?", "type": "text"},
        ],
        "colleague": [
            {"id": "duration", "text": "How long did you work with {candidate}?", "type": "text"},
            {"id": "role", "text": "What was your working relationship?", "type": "text"},
            {"id": "collaboration", "text": "How would you rate their collaboration skills?", "type": "rating"},
            {"id": "communication", "text": "How would you rate their communication?", "type": "rating"},
            {"id": "strengths", "text": "What stood out about their work style?", "type": "text"},
            {"id": "team_impact", "text": "How did they contribute to team success?", "type": "text"},
        ],
        "hr": [
            {"id": "employment_dates", "text": "What were their employment dates?", "type": "text"},
            {"id": "job_title", "text": "What was their official job title?", "type": "text"},
            {"id": "departure_type", "text": "Was this a resignation, termination, or layoff?", "type": "text"},
            {"id": "eligible_rehire", "text": "Are they eligible for rehire?", "type": "boolean"},
            {"id": "attendance", "text": "Were there any attendance issues?", "type": "boolean"},
            {"id": "disciplinary", "text": "Were there any disciplinary actions?", "type": "boolean"},
        ]
    }
    
    def __init__(self):
        """Initialize reference checker and ensure database tables exist"""
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Create reference check tables if they don't exist"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Reference requests table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reference_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                reference_name TEXT NOT NULL,
                reference_email TEXT NOT NULL,
                reference_phone TEXT,
                relationship TEXT NOT NULL,
                company TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                sent_at TEXT,
                completed_at TEXT,
                reminder_count INTEGER DEFAULT 0,
                unique_token TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        # Reference responses table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reference_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id INTEGER NOT NULL,
                question_id TEXT NOT NULL,
                question_text TEXT NOT NULL,
                response TEXT,
                rating INTEGER,
                submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES reference_requests(id)
            )
        ''')
        
        # Employment verifications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS employment_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                company TEXT NOT NULL,
                job_title TEXT NOT NULL,
                start_date TEXT,
                end_date TEXT,
                verified BOOLEAN DEFAULT 0,
                verification_source TEXT,
                discrepancy_flag BOOLEAN DEFAULT 0,
                discrepancy_notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        conn.commit()
    
    def create_reference_request(self, candidate_id: int, reference_data: Dict[str, Any]) -> int:
        """Create a new reference check request"""
        import secrets
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Generate unique token for reference link
        unique_token = secrets.token_urlsafe(32)
        
        cursor.execute('''
            INSERT INTO reference_requests 
            (candidate_id, reference_name, reference_email, reference_phone, 
             relationship, company, unique_token, sent_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            candidate_id,
            reference_data['name'],
            reference_data['email'],
            reference_data.get('phone'),
            reference_data['relationship'],
            reference_data['company'],
            unique_token,
            datetime.now().isoformat()
        ))
        
        request_id = cursor.lastrowid
        conn.commit()
        
        return request_id
    
    def get_reference_requests(self, candidate_id: int) -> List[Dict[str, Any]]:
        """Get all reference requests for a candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, candidate_id, reference_name, reference_email, reference_phone,
                   relationship, company, status, sent_at, completed_at, 
                   reminder_count, unique_token
            FROM reference_requests
            WHERE candidate_id = ?
            ORDER BY created_at DESC
        ''', (candidate_id,))
        
        requests = []
        for row in cursor.fetchall():
            requests.append({
                'id': row[0],
                'candidate_id': row[1],
                'reference_name': row[2],
                'reference_email': row[3],
                'reference_phone': row[4],
                'relationship': row[5],
                'company': row[6],
                'status': row[7],
                'sent_at': row[8],
                'completed_at': row[9],
                'reminder_count': row[10],
                'unique_token': row[11],
            })
        
        return requests
    
    def get_request_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get reference request by unique token"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, candidate_id, reference_name, reference_email, 
                   relationship, company, status, unique_token
            FROM reference_requests
            WHERE unique_token = ?
        ''', (token,))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        return {
            'id': row[0],
            'candidate_id': row[1],
            'reference_name': row[2],
            'reference_email': row[3],
            'relationship': row[4],
            'company': row[5],
            'status': row[6],
            'unique_token': row[7],
        }
    
    def submit_reference_response(self, request_id: int, responses: List[Dict[str, Any]]) -> bool:
        """Submit reference questionnaire responses"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Insert all responses
        for response in responses:
            cursor.execute('''
                INSERT INTO reference_responses 
                (request_id, question_id, question_text, response, rating)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                request_id,
                response['question_id'],
                response['question_text'],
                response.get('response'),
                response.get('rating')
            ))
        
        # Update request status
        cursor.execute('''
            UPDATE reference_requests 
            SET status = 'completed', completed_at = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), request_id))
        
        conn.commit()
        
        # Trigger discrepancy detection
        self._check_discrepancies(request_id)
        
        return True
    
    def get_reference_responses(self, request_id: int) -> List[Dict[str, Any]]:
        """Get all responses for a reference request"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, question_id, question_text, response, rating, submitted_at
            FROM reference_responses
            WHERE request_id = ?
            ORDER BY id
        ''', (request_id,))
        
        responses = []
        for row in cursor.fetchall():
            responses.append({
                'id': row[0],
                'question_id': row[1],
                'question_text': row[2],
                'response': row[3],
                'rating': row[4],
                'submitted_at': row[5],
            })
        
        return responses
    
    def get_questionnaire_template(self, relationship: str, candidate_name: str) -> List[Dict[str, Any]]:
        """Get questionnaire template for relationship type"""
        template_key = relationship.lower()
        template = self.QUESTIONNAIRE_TEMPLATES.get(template_key, self.QUESTIONNAIRE_TEMPLATES['manager'])
        
        # Personalize questions with candidate name
        personalized = []
        for question in template:
            q = question.copy()
            q['text'] = q['text'].replace('{candidate}', candidate_name)
            personalized.append(q)
        
        return personalized
    
    def verify_employment(self, candidate_id: int, employment_data: Dict[str, Any]) -> int:
        """Add employment verification record"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO employment_verifications 
            (candidate_id, company, job_title, start_date, end_date, 
             verified, verification_source, discrepancy_flag, discrepancy_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            candidate_id,
            employment_data['company'],
            employment_data['job_title'],
            employment_data.get('start_date'),
            employment_data.get('end_date'),
            employment_data.get('verified', False),
            employment_data.get('verification_source', 'manual'),
            employment_data.get('discrepancy_flag', False),
            employment_data.get('discrepancy_notes')
        ))
        
        verification_id = cursor.lastrowid
        conn.commit()
        
        return verification_id
    
    def get_employment_verifications(self, candidate_id: int) -> List[Dict[str, Any]]:
        """Get all employment verifications for a candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, company, job_title, start_date, end_date, verified,
                   verification_source, discrepancy_flag, discrepancy_notes, created_at
            FROM employment_verifications
            WHERE candidate_id = ?
            ORDER BY start_date DESC
        ''', (candidate_id,))
        
        verifications = []
        for row in cursor.fetchall():
            verifications.append({
                'id': row[0],
                'company': row[1],
                'job_title': row[2],
                'start_date': row[3],
                'end_date': row[4],
                'verified': bool(row[5]),
                'verification_source': row[6],
                'discrepancy_flag': bool(row[7]),
                'discrepancy_notes': row[8],
                'created_at': row[9],
            })
        
        return verifications
    
    def _check_discrepancies(self, request_id: int):
        """Detect discrepancies between reference responses and candidate-provided info"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get request and responses
        cursor.execute('''
            SELECT candidate_id, company, relationship
            FROM reference_requests
            WHERE id = ?
        ''', (request_id,))
        
        request = cursor.fetchone()
        if not request:
            return
        
        candidate_id, company, relationship = request
        
        # Get responses for this request
        responses = self.get_reference_responses(request_id)
        
        # Extract job title and dates from responses
        job_title = None
        employment_dates = None
        
        for resp in responses:
            if resp['question_id'] == 'title' or resp['question_id'] == 'job_title':
                job_title = resp['response']
            elif resp['question_id'] == 'employment_dates' or resp['question_id'] == 'duration':
                employment_dates = resp['response']
        
        # Get candidate's resume/application data
        cursor.execute('''
            SELECT resume FROM applicants WHERE id = ?
        ''', (candidate_id,))
        
        candidate_row = cursor.fetchone()
        if not candidate_row:
            return
        
        # Check for discrepancies
        discrepancy_flag = False
        discrepancy_notes = []
        
        # Compare job title (simple case-insensitive check)
        if job_title:
            # In real implementation, would parse resume for job titles
            # For now, flag if response seems suspicious
            if 'ceo' in job_title.lower() or 'founder' in job_title.lower():
                if 'verify' in job_title.lower():
                    discrepancy_flag = True
                    discrepancy_notes.append(f"Reference provided unusual title: {job_title}")
        
        # Update or create employment verification
        cursor.execute('''
            INSERT INTO employment_verifications 
            (candidate_id, company, job_title, verified, verification_source, 
             discrepancy_flag, discrepancy_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            candidate_id,
            company,
            job_title or 'Unknown',
            True,
            'reference',
            discrepancy_flag,
            '; '.join(discrepancy_notes) if discrepancy_notes else None
        ))
        
        conn.commit()
    
    def send_reminder(self, request_id: int) -> bool:
        """Send reminder email for pending reference"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE reference_requests 
            SET reminder_count = reminder_count + 1
            WHERE id = ? AND status = 'pending'
        ''', (request_id,))
        
        conn.commit()
        
        # In production, would send actual email via email service
        return cursor.rowcount > 0
    
    def get_reference_statistics(self, candidate_id: int) -> Dict[str, Any]:
        """Get reference check statistics for candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Count requests by status
        cursor.execute('''
            SELECT status, COUNT(*) as count
            FROM reference_requests
            WHERE candidate_id = ?
            GROUP BY status
        ''', (candidate_id,))
        
        status_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Get average ratings from completed references
        cursor.execute('''
            SELECT AVG(rating) as avg_rating, COUNT(DISTINCT request_id) as completed_count
            FROM reference_responses
            WHERE request_id IN (
                SELECT id FROM reference_requests 
                WHERE candidate_id = ? AND status = 'completed'
            ) AND rating IS NOT NULL
        ''', (candidate_id,))
        
        rating_row = cursor.fetchone()
        avg_rating = rating_row[0] if rating_row[0] else 0
        
        # Check for any discrepancy flags
        cursor.execute('''
            SELECT COUNT(*) FROM employment_verifications
            WHERE candidate_id = ? AND discrepancy_flag = 1
        ''', (candidate_id,))
        
        discrepancy_count = cursor.fetchone()[0]
        
        return {
            'total_requested': sum(status_counts.values()),
            'completed': status_counts.get('completed', 0),
            'pending': status_counts.get('pending', 0),
            'bounced': status_counts.get('bounced', 0),
            'average_rating': round(avg_rating, 2),
            'discrepancies_found': discrepancy_count,
            'completion_rate': round(status_counts.get('completed', 0) / sum(status_counts.values()) * 100, 1) if sum(status_counts.values()) > 0 else 0
        }
    
    def generate_reference_email(self, request_id: int, base_url: str) -> Dict[str, str]:
        """Generate email content for reference request"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT r.reference_name, r.unique_token, a.name as candidate_name
            FROM reference_requests r
            JOIN applicants a ON r.candidate_id = a.id
            WHERE r.id = ?
        ''', (request_id,))
        
        row = cursor.fetchone()
        if not row:
            return {}
        
        reference_name, token, candidate_name = row
        reference_link = f"{base_url}/references/submit/{token}"
        
        subject = f"Reference Request for {candidate_name}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Reference Request</h2>
            
            <p>Dear {reference_name},</p>
            
            <p>{candidate_name} has listed you as a professional reference for their application. 
            We would greatly appreciate your feedback on their performance and qualifications.</p>
            
            <p>This confidential questionnaire will take approximately 5-7 minutes to complete.</p>
            
            <p style="margin: 30px 0;">
                <a href="{reference_link}" 
                   style="background: #4F46E5; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                    Complete Reference Check
                </a>
            </p>
            
            <p>Or copy and paste this link into your browser:<br>
            <a href="{reference_link}">{reference_link}</a></p>
            
            <p>This link will expire in 14 days. All responses are kept strictly confidential.</p>
            
            <p>Thank you for your time,<br>
            Talent Acquisition Team</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                If you have any questions or did not expect this email, please contact us immediately.
            </p>
        </body>
        </html>
        """
        
        return {
            'subject': subject,
            'body': body,
            'reference_link': reference_link
        }
