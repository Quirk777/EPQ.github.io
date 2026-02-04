"""
Talent Pool CRM Service
Manages candidate nurturing, re-engagement campaigns, and talent pipeline
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json
import sqlite3
from app.services.db import get_db

@dataclass
class TalentPoolCandidate:
    """Candidate in talent pool"""
    id: int
    candidate_id: int
    pool_type: str  # silver_medalist, passive, future_opportunity, referral
    status: str  # active, engaged, dormant, unsubscribed
    engagement_score: float
    last_contacted: Optional[datetime]
    next_touchpoint: Optional[datetime]
    tags: List[str]
    notes: Optional[str]

@dataclass
class NurtureCampaign:
    """Automated nurture campaign"""
    id: int
    name: str
    campaign_type: str
    pool_type: str
    email_sequence: List[Dict[str, Any]]
    active: bool
    created_at: datetime

@dataclass
class CampaignTouchpoint:
    """Campaign touchpoint/email"""
    id: int
    campaign_id: int
    candidate_id: int
    sequence_step: int
    email_subject: str
    sent_at: datetime
    opened: bool
    clicked: bool
    replied: bool

class TalentPoolManager:
    """
    Talent Pool CRM System
    Nurtures promising candidates who weren't hired but could be future fits
    """
    
    # Pool types and descriptions
    POOL_TYPES = {
        "silver_medalist": "Strong candidates who narrowly missed out",
        "passive": "Passive candidates not actively looking",
        "future_opportunity": "Great candidates, wrong timing",
        "referral": "Candidates referred by employees",
        "alumni": "Former employees eligible for rehire",
        "pipeline": "General talent pipeline"
    }
    
    # Campaign templates
    CAMPAIGN_TEMPLATES = {
        "silver_medalist_nurture": {
            "name": "Silver Medalist 6-Month Nurture",
            "description": "Keep strong runners-up engaged over 6 months",
            "sequence": [
                {
                    "step": 1,
                    "delay_days": 7,
                    "subject": "Thank you for your time with {company}",
                    "template": "silver_medalist_week1"
                },
                {
                    "step": 2,
                    "delay_days": 30,
                    "subject": "Thought you might find this interesting",
                    "template": "value_add_content"
                },
                {
                    "step": 3,
                    "delay_days": 90,
                    "subject": "New opportunities at {company}",
                    "template": "new_roles"
                },
                {
                    "step": 4,
                    "delay_days": 180,
                    "subject": "Checking in - Are you still interested?",
                    "template": "reengagement"
                }
            ]
        },
        "passive_candidate": {
            "name": "Passive Candidate Quarterly Check-in",
            "description": "Keep passive candidates warm with quarterly updates",
            "sequence": [
                {
                    "step": 1,
                    "delay_days": 0,
                    "subject": "Great connecting with you",
                    "template": "passive_intro"
                },
                {
                    "step": 2,
                    "delay_days": 90,
                    "subject": "Q1 Update from {company}",
                    "template": "quarterly_update"
                },
                {
                    "step": 3,
                    "delay_days": 180,
                    "subject": "Q2 Update - What we're working on",
                    "template": "quarterly_update"
                }
            ]
        }
    }
    
    # Engagement scoring weights
    ENGAGEMENT_WEIGHTS = {
        "days_since_contact": -0.5,  # Negative = score decreases over time
        "email_opens": 5,
        "email_clicks": 10,
        "email_replies": 20,
        "profile_views": 3,
        "application_submitted": 15,
        "referral_made": 25
    }
    
    def __init__(self):
        """Initialize talent pool manager and ensure database tables exist"""
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Create talent pool tables if they don't exist"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Talent pool candidates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS talent_pool_candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                pool_type TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                engagement_score REAL DEFAULT 50.0,
                last_contacted TEXT,
                next_touchpoint TEXT,
                tags TEXT,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        # Nurture campaigns table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS nurture_campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                campaign_type TEXT NOT NULL,
                pool_type TEXT NOT NULL,
                email_sequence TEXT NOT NULL,
                active BOOLEAN DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Campaign enrollments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS campaign_enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                candidate_id INTEGER NOT NULL,
                pool_candidate_id INTEGER NOT NULL,
                current_step INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active',
                enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT,
                FOREIGN KEY (campaign_id) REFERENCES nurture_campaigns(id),
                FOREIGN KEY (candidate_id) REFERENCES applicants(id),
                FOREIGN KEY (pool_candidate_id) REFERENCES talent_pool_candidates(id)
            )
        ''')
        
        # Campaign touchpoints table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS campaign_touchpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                campaign_id INTEGER NOT NULL,
                enrollment_id INTEGER NOT NULL,
                candidate_id INTEGER NOT NULL,
                sequence_step INTEGER NOT NULL,
                email_subject TEXT NOT NULL,
                email_body TEXT,
                sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
                opened BOOLEAN DEFAULT 0,
                opened_at TEXT,
                clicked BOOLEAN DEFAULT 0,
                clicked_at TEXT,
                replied BOOLEAN DEFAULT 0,
                replied_at TEXT,
                FOREIGN KEY (campaign_id) REFERENCES nurture_campaigns(id),
                FOREIGN KEY (enrollment_id) REFERENCES campaign_enrollments(id),
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        # Engagement activities table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pool_engagement_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pool_candidate_id INTEGER NOT NULL,
                activity_type TEXT NOT NULL,
                activity_data TEXT,
                points INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (pool_candidate_id) REFERENCES talent_pool_candidates(id)
            )
        ''')
        
        conn.commit()
    
    def add_to_pool(self, candidate_id: int, pool_type: str, tags: Optional[List[str]] = None,
                    notes: Optional[str] = None) -> int:
        """Add candidate to talent pool"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if already in pool
        cursor.execute('''
            SELECT id FROM talent_pool_candidates 
            WHERE candidate_id = ? AND pool_type = ?
        ''', (candidate_id, pool_type))
        
        existing = cursor.fetchone()
        if existing:
            return existing[0]
        
        cursor.execute('''
            INSERT INTO talent_pool_candidates 
            (candidate_id, pool_type, tags, notes, last_contacted)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            candidate_id,
            pool_type,
            json.dumps(tags) if tags else None,
            notes,
            datetime.now().isoformat()
        ))
        
        pool_id = cursor.lastrowid
        conn.commit()
        
        return pool_id
    
    def get_pool_candidates(self, pool_type: Optional[str] = None, 
                           status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get candidates in talent pool"""
        conn = get_db()
        cursor = conn.cursor()
        
        query = '''
            SELECT tp.id, tp.candidate_id, a.name, a.email, tp.pool_type,
                   tp.status, tp.engagement_score, tp.last_contacted, 
                   tp.next_touchpoint, tp.tags, tp.notes, tp.created_at
            FROM talent_pool_candidates tp
            JOIN applicants a ON tp.candidate_id = a.id
            WHERE 1=1
        '''
        params = []
        
        if pool_type:
            query += ' AND tp.pool_type = ?'
            params.append(pool_type)
        
        if status:
            query += ' AND tp.status = ?'
            params.append(status)
        
        query += ' ORDER BY tp.engagement_score DESC, tp.created_at DESC'
        
        cursor.execute(query, params)
        
        candidates = []
        for row in cursor.fetchall():
            candidates.append({
                'id': row[0],
                'candidate_id': row[1],
                'candidate_name': row[2],
                'candidate_email': row[3],
                'pool_type': row[4],
                'status': row[5],
                'engagement_score': row[6],
                'last_contacted': row[7],
                'next_touchpoint': row[8],
                'tags': json.loads(row[9]) if row[9] else [],
                'notes': row[10],
                'created_at': row[11]
            })
        
        return candidates
    
    def update_engagement_score(self, pool_candidate_id: int) -> float:
        """Calculate and update engagement score for a candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get pool candidate
        cursor.execute('''
            SELECT candidate_id, last_contacted FROM talent_pool_candidates
            WHERE id = ?
        ''', (pool_candidate_id,))
        
        pool_candidate = cursor.fetchone()
        if not pool_candidate:
            return 0.0
        
        candidate_id = pool_candidate[0]
        last_contacted = pool_candidate[1]
        
        # Base score
        score = 50.0
        
        # Days since last contact (decreases score)
        if last_contacted:
            days_ago = (datetime.now() - datetime.fromisoformat(last_contacted)).days
            score += days_ago * self.ENGAGEMENT_WEIGHTS['days_since_contact']
        
        # Email engagement from touchpoints
        cursor.execute('''
            SELECT 
                SUM(CASE WHEN opened = 1 THEN 1 ELSE 0 END) as opens,
                SUM(CASE WHEN clicked = 1 THEN 1 ELSE 0 END) as clicks,
                SUM(CASE WHEN replied = 1 THEN 1 ELSE 0 END) as replies
            FROM campaign_touchpoints
            WHERE candidate_id = ?
        ''', (candidate_id,))
        
        engagement = cursor.fetchone()
        if engagement:
            score += (engagement[0] or 0) * self.ENGAGEMENT_WEIGHTS['email_opens']
            score += (engagement[1] or 0) * self.ENGAGEMENT_WEIGHTS['email_clicks']
            score += (engagement[2] or 0) * self.ENGAGEMENT_WEIGHTS['email_replies']
        
        # Activity-based points
        cursor.execute('''
            SELECT SUM(points) FROM pool_engagement_activities
            WHERE pool_candidate_id = ?
        ''', (pool_candidate_id,))
        
        activity_points = cursor.fetchone()[0] or 0
        score += activity_points
        
        # Cap score between 0-100
        score = max(0, min(100, score))
        
        # Update in database
        cursor.execute('''
            UPDATE talent_pool_candidates 
            SET engagement_score = ?, updated_at = ?
            WHERE id = ?
        ''', (score, datetime.now().isoformat(), pool_candidate_id))
        
        conn.commit()
        
        return score
    
    def create_campaign(self, name: str, campaign_type: str, pool_type: str,
                       email_sequence: List[Dict[str, Any]]) -> int:
        """Create a nurture campaign"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO nurture_campaigns 
            (name, campaign_type, pool_type, email_sequence)
            VALUES (?, ?, ?, ?)
        ''', (name, campaign_type, pool_type, json.dumps(email_sequence)))
        
        campaign_id = cursor.lastrowid
        conn.commit()
        
        return campaign_id
    
    def enroll_in_campaign(self, pool_candidate_id: int, campaign_id: int) -> int:
        """Enroll a candidate in a nurture campaign"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get candidate ID
        cursor.execute('''
            SELECT candidate_id FROM talent_pool_candidates WHERE id = ?
        ''', (pool_candidate_id,))
        
        candidate = cursor.fetchone()
        if not candidate:
            return 0
        
        candidate_id = candidate[0]
        
        # Check if already enrolled
        cursor.execute('''
            SELECT id FROM campaign_enrollments 
            WHERE campaign_id = ? AND pool_candidate_id = ? AND status = 'active'
        ''', (campaign_id, pool_candidate_id))
        
        existing = cursor.fetchone()
        if existing:
            return existing[0]
        
        cursor.execute('''
            INSERT INTO campaign_enrollments 
            (campaign_id, candidate_id, pool_candidate_id)
            VALUES (?, ?, ?)
        ''', (campaign_id, candidate_id, pool_candidate_id))
        
        enrollment_id = cursor.lastrowid
        conn.commit()
        
        # Send first email in sequence
        self._send_next_campaign_email(enrollment_id)
        
        return enrollment_id
    
    def _send_next_campaign_email(self, enrollment_id: int) -> bool:
        """Send next email in campaign sequence"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get enrollment and campaign details
        cursor.execute('''
            SELECT e.campaign_id, e.candidate_id, e.current_step, c.email_sequence, a.name
            FROM campaign_enrollments e
            JOIN nurture_campaigns c ON e.campaign_id = c.id
            JOIN applicants a ON e.candidate_id = a.id
            WHERE e.id = ?
        ''', (enrollment_id,))
        
        enrollment = cursor.fetchone()
        if not enrollment:
            return False
        
        campaign_id, candidate_id, current_step, sequence_json, candidate_name = enrollment
        email_sequence = json.loads(sequence_json)
        
        # Get next step
        next_step = current_step + 1
        if next_step > len(email_sequence):
            # Campaign complete
            cursor.execute('''
                UPDATE campaign_enrollments 
                SET status = 'completed', completed_at = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), enrollment_id))
            conn.commit()
            return False
        
        step_data = email_sequence[next_step - 1]
        
        # Generate email content
        subject = step_data['subject'].replace('{company}', 'Your Company')
        body = self._generate_email_body(step_data['template'], candidate_name)
        
        # Create touchpoint
        cursor.execute('''
            INSERT INTO campaign_touchpoints 
            (campaign_id, enrollment_id, candidate_id, sequence_step, 
             email_subject, email_body)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (campaign_id, enrollment_id, candidate_id, next_step, subject, body))
        
        # Update enrollment step
        cursor.execute('''
            UPDATE campaign_enrollments 
            SET current_step = ?
            WHERE id = ?
        ''', (next_step, enrollment_id))
        
        conn.commit()
        
        # In production, would actually send email here
        
        return True
    
    def _generate_email_body(self, template: str, candidate_name: str) -> str:
        """Generate email body from template"""
        templates = {
            "silver_medalist_week1": f"""
                Hi {candidate_name},
                
                Thank you again for taking the time to interview with us. While we've moved forward 
                with another candidate for this particular role, we were genuinely impressed by your 
                background and skills.
                
                We'd love to stay in touch and keep you informed about future opportunities that might 
                be a great fit for your experience.
                
                Best regards,
                Talent Team
            """,
            "value_add_content": f"""
                Hi {candidate_name},
                
                I came across this article about industry trends and thought you might find it interesting 
                given your background in the field.
                
                [Article link would go here]
                
                Hope all is well!
                
                Best,
                Talent Team
            """,
            "new_roles": f"""
                Hi {candidate_name},
                
                We have some exciting new opportunities that I think could be a great match for your 
                skills and experience. Would you be open to a quick conversation?
                
                [Role links would go here]
                
                Looking forward to hearing from you,
                Talent Team
            """,
            "reengagement": f"""
                Hi {candidate_name},
                
                It's been a few months since we last connected. I wanted to check in and see if you're 
                still interested in opportunities with our team.
                
                Are you currently open to new opportunities?
                
                Best regards,
                Talent Team
            """,
            "passive_intro": f"""
                Hi {candidate_name},
                
                It was great meeting you! Even though you're not actively looking right now, I'd love 
                to keep in touch and share updates about our company and team.
                
                Best,
                Talent Team
            """,
            "quarterly_update": f"""
                Hi {candidate_name},
                
                Quick update from our team: [Company updates would go here]
                
                Hope you're doing well!
                
                Best,
                Talent Team
            """
        }
        
        return templates.get(template, "Template not found")
    
    def track_email_engagement(self, touchpoint_id: int, engagement_type: str) -> bool:
        """Track email engagement (open, click, reply)"""
        conn = get_db()
        cursor = conn.cursor()
        
        field_map = {
            'open': ('opened', 'opened_at'),
            'click': ('clicked', 'clicked_at'),
            'reply': ('replied', 'replied_at')
        }
        
        if engagement_type not in field_map:
            return False
        
        field, timestamp_field = field_map[engagement_type]
        
        cursor.execute(f'''
            UPDATE campaign_touchpoints 
            SET {field} = 1, {timestamp_field} = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), touchpoint_id))
        
        # Get pool candidate and update engagement score
        cursor.execute('''
            SELECT tp.candidate_id
            FROM campaign_touchpoints ct
            JOIN talent_pool_candidates tp ON ct.candidate_id = tp.candidate_id
            WHERE ct.id = ?
        ''', (touchpoint_id,))
        
        result = cursor.fetchone()
        if result:
            cursor.execute('''
                SELECT id FROM talent_pool_candidates WHERE candidate_id = ?
            ''', (result[0],))
            pool_id = cursor.fetchone()
            if pool_id:
                self.update_engagement_score(pool_id[0])
        
        conn.commit()
        
        return True
    
    def get_campaign_performance(self, campaign_id: int) -> Dict[str, Any]:
        """Get campaign performance metrics"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get campaign info
        cursor.execute('''
            SELECT name, campaign_type, pool_type, active, created_at
            FROM nurture_campaigns WHERE id = ?
        ''', (campaign_id,))
        
        campaign = cursor.fetchone()
        if not campaign:
            return {}
        
        # Enrollment stats
        cursor.execute('''
            SELECT 
                COUNT(*) as total_enrolled,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
            FROM campaign_enrollments WHERE campaign_id = ?
        ''', (campaign_id,))
        
        enrollment_stats = cursor.fetchone()
        
        # Email stats
        cursor.execute('''
            SELECT 
                COUNT(*) as total_sent,
                SUM(CASE WHEN opened = 1 THEN 1 ELSE 0 END) as opens,
                SUM(CASE WHEN clicked = 1 THEN 1 ELSE 0 END) as clicks,
                SUM(CASE WHEN replied = 1 THEN 1 ELSE 0 END) as replies
            FROM campaign_touchpoints WHERE campaign_id = ?
        ''', (campaign_id,))
        
        email_stats = cursor.fetchone()
        
        total_sent = email_stats[0] or 1  # Avoid division by zero
        
        return {
            'campaign_id': campaign_id,
            'name': campaign[0],
            'campaign_type': campaign[1],
            'pool_type': campaign[2],
            'active': bool(campaign[3]),
            'created_at': campaign[4],
            'enrollments': {
                'total': enrollment_stats[0] or 0,
                'active': enrollment_stats[1] or 0,
                'completed': enrollment_stats[2] or 0
            },
            'email_metrics': {
                'total_sent': email_stats[0] or 0,
                'opens': email_stats[1] or 0,
                'clicks': email_stats[2] or 0,
                'replies': email_stats[3] or 0,
                'open_rate': round((email_stats[1] or 0) / total_sent * 100, 1),
                'click_rate': round((email_stats[2] or 0) / total_sent * 100, 1),
                'reply_rate': round((email_stats[3] or 0) / total_sent * 100, 1)
            }
        }
    
    def get_pool_statistics(self) -> Dict[str, Any]:
        """Get overall talent pool statistics"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Pool size by type
        cursor.execute('''
            SELECT pool_type, COUNT(*) as count
            FROM talent_pool_candidates
            WHERE status = 'active'
            GROUP BY pool_type
        ''')
        pool_sizes = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Average engagement score
        cursor.execute('''
            SELECT AVG(engagement_score) FROM talent_pool_candidates
            WHERE status = 'active'
        ''')
        avg_engagement = cursor.fetchone()[0] or 0
        
        # Total campaigns
        cursor.execute('SELECT COUNT(*) FROM nurture_campaigns WHERE active = 1')
        active_campaigns = cursor.fetchone()[0]
        
        # Total touchpoints sent this month
        cursor.execute('''
            SELECT COUNT(*) FROM campaign_touchpoints
            WHERE sent_at >= date('now', 'start of month')
        ''')
        monthly_touchpoints = cursor.fetchone()[0]
        
        return {
            'pool_sizes': pool_sizes,
            'total_active_candidates': sum(pool_sizes.values()),
            'average_engagement_score': round(avg_engagement, 1),
            'active_campaigns': active_campaigns,
            'monthly_touchpoints': monthly_touchpoints
        }
