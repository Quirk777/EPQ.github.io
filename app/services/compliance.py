"""
Compliance & Audit Trail Service
Handles GDPR/EEOC compliance, audit logging, and data anonymization
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json
import sqlite3
import hashlib
from app.services.db import get_db

@dataclass
class AuditLog:
    """Audit log entry"""
    id: int
    user_id: int
    action: str
    resource_type: str
    resource_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Optional[str]
    timestamp: datetime

@dataclass
class ConsentRecord:
    """Candidate consent record"""
    id: int
    candidate_id: int
    consent_type: str
    granted: bool
    granted_at: Optional[datetime]
    revoked_at: Optional[datetime]
    ip_address: Optional[str]
    consent_text: str

@dataclass
class DataRetentionPolicy:
    """Data retention policy"""
    id: int
    data_type: str
    retention_days: int
    auto_delete: bool
    description: str

class ComplianceManager:
    """
    Compliance and audit trail management
    Ensures GDPR/EEOC compliance, tracks all sensitive operations
    """
    
    # Standard consent types
    CONSENT_TYPES = {
        "data_processing": "Process personal data for recruitment purposes",
        "data_storage": "Store personal data in our systems",
        "email_communication": "Send email communications about opportunities",
        "profile_sharing": "Share profile with hiring managers",
        "background_check": "Conduct background and reference checks",
        "assessment_data": "Store and analyze psychometric assessment results",
        "third_party_sharing": "Share data with third-party assessment providers"
    }
    
    # EEOC protected categories (for monitoring, NOT for decision making)
    EEOC_CATEGORIES = {
        "race": ["Prefer not to say", "White", "Black/African American", "Hispanic/Latino", "Asian", "Native American", "Other"],
        "gender": ["Prefer not to say", "Male", "Female", "Non-binary", "Other"],
        "veteran_status": ["Prefer not to say", "Veteran", "Not a veteran"],
        "disability_status": ["Prefer not to say", "Yes", "No"]
    }
    
    # Data retention policies (in days)
    DEFAULT_RETENTION = {
        "applications": 730,  # 2 years
        "assessments": 1095,  # 3 years
        "interviews": 730,
        "rejected_candidates": 365,  # 1 year
        "audit_logs": 2555,  # 7 years (legal requirement)
        "consent_records": 2555,  # 7 years
    }
    
    def __init__(self):
        """Initialize compliance manager and ensure database tables exist"""
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Create compliance tables if they don't exist"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Audit logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                resource_id INTEGER,
                ip_address TEXT,
                user_agent TEXT,
                details TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        
        # Consent records table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS consent_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                consent_type TEXT NOT NULL,
                granted BOOLEAN NOT NULL,
                granted_at TEXT,
                revoked_at TEXT,
                ip_address TEXT,
                consent_text TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        # Data retention policies table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS data_retention_policies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data_type TEXT UNIQUE NOT NULL,
                retention_days INTEGER NOT NULL,
                auto_delete BOOLEAN DEFAULT 0,
                description TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # EEOC demographic data (voluntary, anonymized from hiring process)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS eeoc_demographics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                race TEXT,
                gender TEXT,
                veteran_status TEXT,
                disability_status TEXT,
                anonymized_id TEXT UNIQUE,
                submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        # Anonymized candidates (for initial blind screening)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS anonymized_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                anonymized_name TEXT NOT NULL,
                anonymized_email TEXT NOT NULL,
                skills TEXT,
                experience_years INTEGER,
                education_level TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        # Data deletion requests
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS deletion_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
                processed_at TEXT,
                status TEXT DEFAULT 'pending',
                processed_by INTEGER,
                notes TEXT,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id),
                FOREIGN KEY (processed_by) REFERENCES users(id)
            )
        ''')
        
        conn.commit()
        
        # Initialize default retention policies
        self._init_default_policies()
    
    def _init_default_policies(self):
        """Initialize default data retention policies"""
        conn = get_db()
        cursor = conn.cursor()
        
        for data_type, days in self.DEFAULT_RETENTION.items():
            cursor.execute('''
                INSERT OR IGNORE INTO data_retention_policies (data_type, retention_days, auto_delete, description)
                VALUES (?, ?, 0, ?)
            ''', (data_type, days, f"Retention policy for {data_type}"))
        
        conn.commit()
    
    def log_action(self, user_id: int, action: str, resource_type: str, 
                   resource_id: Optional[int] = None, details: Optional[Dict] = None,
                   ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> int:
        """Log an audit trail entry"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO audit_logs (user_id, action, resource_type, resource_id, 
                                   ip_address, user_agent, details)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            action,
            resource_type,
            resource_id,
            ip_address,
            user_agent,
            json.dumps(details) if details else None
        ))
        
        log_id = cursor.lastrowid
        conn.commit()
        
        return log_id
    
    def get_audit_logs(self, filters: Optional[Dict[str, Any]] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get audit logs with optional filters"""
        conn = get_db()
        cursor = conn.cursor()
        
        query = '''
            SELECT a.id, a.user_id, u.email as user_email, a.action, 
                   a.resource_type, a.resource_id, a.ip_address, 
                   a.user_agent, a.details, a.timestamp
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE 1=1
        '''
        params = []
        
        if filters:
            if 'user_id' in filters:
                query += ' AND a.user_id = ?'
                params.append(filters['user_id'])
            if 'action' in filters:
                query += ' AND a.action = ?'
                params.append(filters['action'])
            if 'resource_type' in filters:
                query += ' AND a.resource_type = ?'
                params.append(filters['resource_type'])
            if 'start_date' in filters:
                query += ' AND a.timestamp >= ?'
                params.append(filters['start_date'])
            if 'end_date' in filters:
                query += ' AND a.timestamp <= ?'
                params.append(filters['end_date'])
        
        query += ' ORDER BY a.timestamp DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        
        logs = []
        for row in cursor.fetchall():
            logs.append({
                'id': row[0],
                'user_id': row[1],
                'user_email': row[2],
                'action': row[3],
                'resource_type': row[4],
                'resource_id': row[5],
                'ip_address': row[6],
                'user_agent': row[7],
                'details': json.loads(row[8]) if row[8] else None,
                'timestamp': row[9]
            })
        
        return logs
    
    def record_consent(self, candidate_id: int, consent_type: str, granted: bool,
                      ip_address: Optional[str] = None) -> int:
        """Record candidate consent"""
        conn = get_db()
        cursor = conn.cursor()
        
        consent_text = self.CONSENT_TYPES.get(consent_type, "Custom consent")
        
        cursor.execute('''
            INSERT INTO consent_records (candidate_id, consent_type, granted, 
                                        granted_at, revoked_at, ip_address, consent_text)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            candidate_id,
            consent_type,
            granted,
            datetime.now().isoformat() if granted else None,
            datetime.now().isoformat() if not granted else None,
            ip_address,
            consent_text
        ))
        
        consent_id = cursor.lastrowid
        conn.commit()
        
        return consent_id
    
    def get_consents(self, candidate_id: int) -> List[Dict[str, Any]]:
        """Get all consent records for a candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, consent_type, granted, granted_at, revoked_at, 
                   ip_address, consent_text, created_at
            FROM consent_records
            WHERE candidate_id = ?
            ORDER BY created_at DESC
        ''', (candidate_id,))
        
        consents = []
        for row in cursor.fetchall():
            consents.append({
                'id': row[0],
                'consent_type': row[1],
                'granted': bool(row[2]),
                'granted_at': row[3],
                'revoked_at': row[4],
                'ip_address': row[5],
                'consent_text': row[6],
                'created_at': row[7]
            })
        
        return consents
    
    def anonymize_candidate(self, candidate_id: int) -> Dict[str, Any]:
        """Create anonymized profile for blind screening"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get candidate data
        cursor.execute('''
            SELECT name, email, resume, role_id
            FROM applicants
            WHERE id = ?
        ''', (candidate_id,))
        
        candidate = cursor.fetchone()
        if not candidate:
            return {}
        
        # Generate anonymized identifier
        anonymized_id = hashlib.sha256(f"{candidate_id}-{datetime.now().isoformat()}".encode()).hexdigest()[:12]
        anonymized_name = f"Candidate {anonymized_id[:6].upper()}"
        anonymized_email = f"candidate-{anonymized_id[:8]}@anonymous.local"
        
        # Extract skills and experience (simplified - in production would use NLP)
        resume_text = candidate[2] or ""
        skills = self._extract_skills(resume_text)
        experience_years = self._estimate_experience(resume_text)
        education_level = self._extract_education(resume_text)
        
        # Create anonymized profile
        cursor.execute('''
            INSERT INTO anonymized_profiles 
            (candidate_id, anonymized_name, anonymized_email, skills, 
             experience_years, education_level)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            candidate_id,
            anonymized_name,
            anonymized_email,
            json.dumps(skills),
            experience_years,
            education_level
        ))
        
        profile_id = cursor.lastrowid
        conn.commit()
        
        return {
            'id': profile_id,
            'anonymized_name': anonymized_name,
            'anonymized_email': anonymized_email,
            'skills': skills,
            'experience_years': experience_years,
            'education_level': education_level
        }
    
    def _extract_skills(self, resume_text: str) -> List[str]:
        """Extract skills from resume (simplified)"""
        # Common tech skills
        skill_keywords = [
            'python', 'javascript', 'java', 'react', 'node', 'sql', 'aws',
            'leadership', 'management', 'communication', 'agile', 'scrum'
        ]
        
        resume_lower = resume_text.lower()
        found_skills = [skill for skill in skill_keywords if skill in resume_lower]
        return found_skills[:10]  # Top 10 skills
    
    def _estimate_experience(self, resume_text: str) -> int:
        """Estimate years of experience (simplified)"""
        # Look for year patterns
        import re
        years = re.findall(r'\b(19|20)\d{2}\b', resume_text)
        if len(years) >= 2:
            try:
                earliest = min([int(y) for y in years])
                return min(datetime.now().year - earliest, 30)  # Cap at 30 years
            except:
                pass
        return 0
    
    def _extract_education(self, resume_text: str) -> str:
        """Extract education level (simplified)"""
        resume_lower = resume_text.lower()
        
        if 'phd' in resume_lower or 'doctorate' in resume_lower:
            return 'PhD'
        elif 'master' in resume_lower or 'mba' in resume_lower:
            return 'Masters'
        elif 'bachelor' in resume_lower or 'b.s.' in resume_lower or 'b.a.' in resume_lower:
            return 'Bachelors'
        elif 'associate' in resume_lower:
            return 'Associates'
        else:
            return 'High School'
    
    def get_anonymized_profiles(self, role_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get anonymized candidate profiles for blind screening"""
        conn = get_db()
        cursor = conn.cursor()
        
        if role_id:
            cursor.execute('''
                SELECT ap.id, ap.candidate_id, ap.anonymized_name, ap.anonymized_email,
                       ap.skills, ap.experience_years, ap.education_level, ap.created_at
                FROM anonymized_profiles ap
                JOIN applicants a ON ap.candidate_id = a.id
                WHERE a.role_id = ?
                ORDER BY ap.created_at DESC
            ''', (role_id,))
        else:
            cursor.execute('''
                SELECT id, candidate_id, anonymized_name, anonymized_email,
                       skills, experience_years, education_level, created_at
                FROM anonymized_profiles
                ORDER BY created_at DESC
            ''')
        
        profiles = []
        for row in cursor.fetchall():
            profiles.append({
                'id': row[0],
                'candidate_id': row[1],
                'anonymized_name': row[2],
                'anonymized_email': row[3],
                'skills': json.loads(row[4]) if row[4] else [],
                'experience_years': row[5],
                'education_level': row[6],
                'created_at': row[7]
            })
        
        return profiles
    
    def request_data_deletion(self, candidate_id: int, notes: Optional[str] = None) -> int:
        """Create GDPR data deletion request"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO deletion_requests (candidate_id, notes)
            VALUES (?, ?)
        ''', (candidate_id, notes))
        
        request_id = cursor.lastrowid
        conn.commit()
        
        return request_id
    
    def process_deletion_request(self, request_id: int, user_id: int, approved: bool) -> bool:
        """Process GDPR deletion request"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get request details
        cursor.execute('''
            SELECT candidate_id, status FROM deletion_requests WHERE id = ?
        ''', (request_id,))
        
        request = cursor.fetchone()
        if not request or request[1] != 'pending':
            return False
        
        candidate_id = request[0]
        
        if approved:
            # Anonymize data instead of hard delete (for audit trail)
            cursor.execute('''
                UPDATE applicants 
                SET name = 'DELETED',
                    email = ?,
                    phone = 'DELETED',
                    resume = 'Data deleted per GDPR request'
                WHERE id = ?
            ''', (f'deleted-{candidate_id}@gdpr.deleted', candidate_id))
            
            # Delete sensitive assessment data
            cursor.execute('DELETE FROM responses WHERE applicant_id = ?', (candidate_id,))
            
            status = 'approved'
        else:
            status = 'rejected'
        
        # Update request
        cursor.execute('''
            UPDATE deletion_requests 
            SET status = ?, processed_at = ?, processed_by = ?
            WHERE id = ?
        ''', (status, datetime.now().isoformat(), user_id, request_id))
        
        conn.commit()
        
        # Log the action
        self.log_action(user_id, 'data_deletion', 'candidate', candidate_id, 
                       {'request_id': request_id, 'approved': approved})
        
        return True
    
    def get_deletion_requests(self, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get data deletion requests"""
        conn = get_db()
        cursor = conn.cursor()
        
        if status:
            cursor.execute('''
                SELECT d.id, d.candidate_id, a.name, a.email, d.requested_at,
                       d.processed_at, d.status, u.email as processed_by_email, d.notes
                FROM deletion_requests d
                JOIN applicants a ON d.candidate_id = a.id
                LEFT JOIN users u ON d.processed_by = u.id
                WHERE d.status = ?
                ORDER BY d.requested_at DESC
            ''', (status,))
        else:
            cursor.execute('''
                SELECT d.id, d.candidate_id, a.name, a.email, d.requested_at,
                       d.processed_at, d.status, u.email as processed_by_email, d.notes
                FROM deletion_requests d
                JOIN applicants a ON d.candidate_id = a.id
                LEFT JOIN users u ON d.processed_by = u.id
                ORDER BY d.requested_at DESC
            ''')
        
        requests = []
        for row in cursor.fetchall():
            requests.append({
                'id': row[0],
                'candidate_id': row[1],
                'candidate_name': row[2],
                'candidate_email': row[3],
                'requested_at': row[4],
                'processed_at': row[5],
                'status': row[6],
                'processed_by': row[7],
                'notes': row[8]
            })
        
        return requests
    
    def get_compliance_report(self) -> Dict[str, Any]:
        """Generate compliance overview report"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Count audit logs by action type
        cursor.execute('''
            SELECT action, COUNT(*) as count
            FROM audit_logs
            WHERE timestamp >= date('now', '-30 days')
            GROUP BY action
            ORDER BY count DESC
            LIMIT 10
        ''')
        recent_actions = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Consent statistics
        cursor.execute('''
            SELECT consent_type, 
                   SUM(CASE WHEN granted = 1 THEN 1 ELSE 0 END) as granted,
                   SUM(CASE WHEN granted = 0 THEN 1 ELSE 0 END) as revoked
            FROM consent_records
            GROUP BY consent_type
        ''')
        consent_stats = {}
        for row in cursor.fetchall():
            consent_stats[row[0]] = {'granted': row[1], 'revoked': row[2]}
        
        # Deletion requests
        cursor.execute('''
            SELECT status, COUNT(*) FROM deletion_requests GROUP BY status
        ''')
        deletion_stats = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Data retention check
        cursor.execute('SELECT COUNT(*) FROM applicants WHERE created_at < date("now", "-730 days")')
        old_applications = cursor.fetchone()[0]
        
        # Anonymized profiles count
        cursor.execute('SELECT COUNT(*) FROM anonymized_profiles')
        anonymized_count = cursor.fetchone()[0]
        
        # Total audit logs
        cursor.execute('SELECT COUNT(*) FROM audit_logs')
        total_audit_logs = cursor.fetchone()[0]
        
        return {
            'recent_actions': recent_actions,
            'consent_statistics': consent_stats,
            'deletion_requests': deletion_stats,
            'old_applications_count': old_applications,
            'anonymized_profiles_count': anonymized_count,
            'total_audit_logs': total_audit_logs,
            'generated_at': datetime.now().isoformat()
        }
    
    def export_candidate_data(self, candidate_id: int) -> Dict[str, Any]:
        """Export all candidate data (GDPR right to access)"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get candidate info
        cursor.execute('''
            SELECT id, name, email, phone, resume, created_at
            FROM applicants WHERE id = ?
        ''', (candidate_id,))
        
        candidate = cursor.fetchone()
        if not candidate:
            return {}
        
        # Get assessment responses
        cursor.execute('''
            SELECT question_id, response, score, submitted_at
            FROM responses WHERE applicant_id = ?
        ''', (candidate_id,))
        responses = [{'question_id': r[0], 'response': r[1], 'score': r[2], 'submitted_at': r[3]} 
                     for r in cursor.fetchall()]
        
        # Get consent records
        consents = self.get_consents(candidate_id)
        
        # Get audit logs related to this candidate
        cursor.execute('''
            SELECT action, timestamp, details
            FROM audit_logs
            WHERE resource_type = 'candidate' AND resource_id = ?
        ''', (candidate_id,))
        audit_trail = [{'action': r[0], 'timestamp': r[1], 'details': r[2]} 
                       for r in cursor.fetchall()]
        
        return {
            'personal_info': {
                'id': candidate[0],
                'name': candidate[1],
                'email': candidate[2],
                'phone': candidate[3],
                'resume': candidate[4],
                'created_at': candidate[5]
            },
            'assessment_responses': responses,
            'consent_records': consents,
            'audit_trail': audit_trail,
            'exported_at': datetime.now().isoformat()
        }
