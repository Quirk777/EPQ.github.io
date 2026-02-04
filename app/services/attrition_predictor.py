"""
Predictive Attrition Risk Service
ML model for predicting candidate flight risk and retention likelihood
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json
import sqlite3
import re
from app.services.db import get_db

@dataclass
class AttritionRiskScore:
    """Attrition risk assessment"""
    candidate_id: int
    risk_score: float  # 0-100 (higher = more flight risk)
    risk_level: str  # low, medium, high
    factors: List[Dict[str, Any]]
    recommendations: List[str]
    assessed_at: datetime

@dataclass
class TenurePattern:
    """Employment tenure pattern"""
    company: str
    role: str
    start_date: str
    end_date: Optional[str]
    tenure_months: int
    reason_for_leaving: Optional[str]

class AttritionPredictor:
    """
    Attrition Risk Prediction System
    Analyzes job-hopping patterns, role-fit mismatches, and other indicators
    """
    
    # Risk factor weights
    RISK_WEIGHTS = {
        "job_hopping": 25,  # Frequent job changes
        "short_tenure": 20,  # Multiple jobs < 12 months
        "role_fit_mismatch": 20,  # Psychometric mismatch with role
        "overqualified": 15,  # Skills/experience exceed requirements
        "compensation_mismatch": 10,  # Salary expectations vs offer
        "career_trajectory": 10,  # Moving backwards/sideways
    }
    
    # Tenure thresholds (in months)
    TENURE_THRESHOLDS = {
        "job_hopper": 18,  # Less than 18 months average tenure
        "short_stint": 12,  # Individual job < 12 months
        "stable": 36,  # 3+ years is stable
    }
    
    # Role fit thresholds
    FIT_THRESHOLDS = {
        "excellent": 80,
        "good": 60,
        "concerning": 40
    }
    
    def __init__(self):
        """Initialize attrition predictor and ensure database tables exist"""
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Create attrition risk tables if they don't exist"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Attrition risk scores table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attrition_risk_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                risk_score REAL NOT NULL,
                risk_level TEXT NOT NULL,
                factors TEXT,
                recommendations TEXT,
                assessed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        # Employment history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS employment_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                company TEXT NOT NULL,
                role TEXT NOT NULL,
                start_date TEXT,
                end_date TEXT,
                tenure_months INTEGER,
                reason_for_leaving TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        # Retention interventions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS retention_interventions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_id INTEGER NOT NULL,
                intervention_type TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'planned',
                scheduled_date TEXT,
                completed_date TEXT,
                outcome TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (candidate_id) REFERENCES applicants(id)
            )
        ''')
        
        conn.commit()
    
    def calculate_risk_score(self, candidate_id: int) -> Dict[str, Any]:
        """Calculate comprehensive attrition risk score for candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Get candidate info
        cursor.execute('''
            SELECT id, name, email, resume, role_id FROM applicants WHERE id = ?
        ''', (candidate_id,))
        
        candidate = cursor.fetchone()
        if not candidate:
            return {}
        
        risk_score = 0.0
        risk_factors = []
        recommendations = []
        
        # Factor 1: Job hopping analysis
        job_hopping_risk, job_hopping_factors = self._analyze_job_hopping(candidate_id)
        risk_score += job_hopping_risk * (self.RISK_WEIGHTS["job_hopping"] / 100)
        risk_factors.extend(job_hopping_factors)
        
        # Factor 2: Role fit mismatch
        role_fit_risk, role_fit_factors = self._analyze_role_fit(candidate_id, candidate[4])
        risk_score += role_fit_risk * (self.RISK_WEIGHTS["role_fit_mismatch"] / 100)
        risk_factors.extend(role_fit_factors)
        
        # Factor 3: Overqualification
        overqual_risk, overqual_factors = self._analyze_overqualification(candidate[3])
        risk_score += overqual_risk * (self.RISK_WEIGHTS["overqualified"] / 100)
        risk_factors.extend(overqual_factors)
        
        # Factor 4: Career trajectory
        trajectory_risk, trajectory_factors = self._analyze_career_trajectory(candidate_id)
        risk_score += trajectory_risk * (self.RISK_WEIGHTS["career_trajectory"] / 100)
        risk_factors.extend(trajectory_factors)
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = "high"
            recommendations.extend([
                "Consider offering above-market compensation",
                "Provide clear growth path and timeline",
                "Assign challenging projects immediately",
                "Schedule frequent check-ins (weekly)",
                "Consider retention bonus with vesting"
            ])
        elif risk_score >= 40:
            risk_level = "medium"
            recommendations.extend([
                "Discuss career development goals in first month",
                "Provide mentorship or leadership opportunities",
                "Schedule bi-weekly 1-on-1s",
                "Monitor engagement closely in first 90 days"
            ])
        else:
            risk_level = "low"
            recommendations.extend([
                "Standard onboarding process",
                "Monthly check-ins during first quarter",
                "Focus on cultural integration"
            ])
        
        # Store assessment
        cursor.execute('''
            INSERT INTO attrition_risk_scores 
            (candidate_id, risk_score, risk_level, factors, recommendations)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            candidate_id,
            risk_score,
            risk_level,
            json.dumps(risk_factors),
            json.dumps(recommendations)
        ))
        
        conn.commit()
        
        return {
            'candidate_id': candidate_id,
            'candidate_name': candidate[1],
            'risk_score': round(risk_score, 1),
            'risk_level': risk_level,
            'factors': risk_factors,
            'recommendations': recommendations,
            'assessed_at': datetime.now().isoformat()
        }
    
    def _analyze_job_hopping(self, candidate_id: int) -> tuple[float, List[Dict[str, Any]]]:
        """Analyze job hopping patterns"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT company, role, start_date, end_date, tenure_months
            FROM employment_history
            WHERE candidate_id = ?
            ORDER BY start_date DESC
        ''', (candidate_id,))
        
        jobs = cursor.fetchall()
        
        if not jobs:
            return 0.0, []
        
        risk_score = 0.0
        factors = []
        
        # Calculate average tenure
        tenures = [job[4] for job in jobs if job[4]]
        if tenures:
            avg_tenure = sum(tenures) / len(tenures)
            
            if avg_tenure < self.TENURE_THRESHOLDS["job_hopper"]:
                risk_score = 80.0
                factors.append({
                    'factor': 'job_hopping',
                    'severity': 'high',
                    'description': f'Average tenure of {avg_tenure:.1f} months indicates frequent job changes',
                    'value': avg_tenure
                })
            elif avg_tenure < self.TENURE_THRESHOLDS["stable"]:
                risk_score = 40.0
                factors.append({
                    'factor': 'job_hopping',
                    'severity': 'medium',
                    'description': f'Average tenure of {avg_tenure:.1f} months suggests moderate stability',
                    'value': avg_tenure
                })
        
        # Count short stints
        short_stints = sum(1 for t in tenures if t < self.TENURE_THRESHOLDS["short_stint"])
        if short_stints >= 2:
            risk_score = max(risk_score, 70.0)
            factors.append({
                'factor': 'short_tenures',
                'severity': 'high',
                'description': f'{short_stints} jobs lasted less than 12 months',
                'value': short_stints
            })
        
        # Recent job change pattern
        if len(jobs) >= 3:
            recent_tenures = tenures[:3]
            if all(t < 24 for t in recent_tenures):
                risk_score = max(risk_score, 75.0)
                factors.append({
                    'factor': 'recent_pattern',
                    'severity': 'high',
                    'description': 'Last 3 jobs all under 2 years - concerning pattern',
                    'value': recent_tenures
                })
        
        return risk_score, factors
    
    def _analyze_role_fit(self, candidate_id: int, role_id: Optional[int]) -> tuple[float, List[Dict[str, Any]]]:
        """Analyze psychometric role fit"""
        if not role_id:
            return 0.0, []
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Get candidate's psychometric scores
        cursor.execute('''
            SELECT AVG(score) as avg_score FROM responses
            WHERE applicant_id = ?
        ''', (candidate_id,))
        
        result = cursor.fetchone()
        avg_score = result[0] if result and result[0] else None
        
        if not avg_score:
            return 0.0, []
        
        risk_score = 0.0
        factors = []
        
        # Convert to 0-100 scale (assuming scores are 0-10)
        fit_score = (avg_score / 10) * 100
        
        if fit_score < self.FIT_THRESHOLDS["concerning"]:
            risk_score = 90.0
            factors.append({
                'factor': 'role_fit_mismatch',
                'severity': 'high',
                'description': f'Low psychometric fit score ({fit_score:.1f}/100) suggests poor role alignment',
                'value': fit_score
            })
        elif fit_score < self.FIT_THRESHOLDS["good"]:
            risk_score = 50.0
            factors.append({
                'factor': 'role_fit_mismatch',
                'severity': 'medium',
                'description': f'Moderate fit score ({fit_score:.1f}/100) - monitor for engagement issues',
                'value': fit_score
            })
        
        return risk_score, factors
    
    def _analyze_overqualification(self, resume: Optional[str]) -> tuple[float, List[Dict[str, Any]]]:
        """Analyze if candidate is overqualified"""
        if not resume:
            return 0.0, []
        
        risk_score = 0.0
        factors = []
        
        resume_lower = resume.lower()
        
        # Check for senior indicators
        senior_keywords = ['vp', 'vice president', 'director', 'head of', 'chief', 'ceo', 'cto', 'cfo']
        senior_count = sum(1 for keyword in senior_keywords if keyword in resume_lower)
        
        if senior_count >= 2:
            risk_score = 60.0
            factors.append({
                'factor': 'overqualified',
                'severity': 'medium',
                'description': 'Senior leadership experience may indicate overqualification',
                'value': senior_count
            })
        
        # Check for advanced degrees
        if 'phd' in resume_lower or 'doctorate' in resume_lower:
            risk_score = max(risk_score, 40.0)
            factors.append({
                'factor': 'overqualified_education',
                'severity': 'low',
                'description': 'Advanced degree (PhD) may signal overqualification',
                'value': 'PhD'
            })
        
        return risk_score, factors
    
    def _analyze_career_trajectory(self, candidate_id: int) -> tuple[float, List[Dict[str, Any]]]:
        """Analyze career progression trajectory"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT role FROM employment_history
            WHERE candidate_id = ?
            ORDER BY start_date DESC
            LIMIT 3
        ''', (candidate_id,))
        
        recent_roles = [row[0] for row in cursor.fetchall()]
        
        if len(recent_roles) < 2:
            return 0.0, []
        
        risk_score = 0.0
        factors = []
        
        # Simple heuristic: check for seniority keywords
        seniority_levels = {
            'intern': 1, 'junior': 2, 'associate': 3, 'mid': 4,
            'senior': 5, 'lead': 6, 'principal': 7, 'staff': 7,
            'manager': 8, 'director': 9, 'vp': 10, 'chief': 11
        }
        
        def get_seniority(role: str) -> int:
            role_lower = role.lower()
            for keyword, level in seniority_levels.items():
                if keyword in role_lower:
                    return level
            return 4  # Default to mid-level
        
        levels = [get_seniority(role) for role in recent_roles]
        
        # Check for downward movement
        if len(levels) >= 2 and levels[0] < levels[1]:
            risk_score = 70.0
            factors.append({
                'factor': 'career_regression',
                'severity': 'high',
                'description': 'Recent role appears to be a step down from previous position',
                'value': f'{recent_roles[1]} → {recent_roles[0]}'
            })
        
        # Check for lateral moves
        if len(levels) >= 2 and levels[0] == levels[1]:
            risk_score = 30.0
            factors.append({
                'factor': 'lateral_move',
                'severity': 'low',
                'description': 'Lateral career move - may be seeking growth opportunity',
                'value': recent_roles[0]
            })
        
        return risk_score, factors
    
    def add_employment_history(self, candidate_id: int, employment_data: List[Dict[str, Any]]) -> int:
        """Add employment history for candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        count = 0
        for job in employment_data:
            # Calculate tenure
            tenure_months = 0
            if job.get('start_date') and job.get('end_date'):
                try:
                    start = datetime.fromisoformat(job['start_date'])
                    end = datetime.fromisoformat(job['end_date'])
                    tenure_months = int((end - start).days / 30.44)
                except:
                    tenure_months = 0
            
            cursor.execute('''
                INSERT INTO employment_history 
                (candidate_id, company, role, start_date, end_date, 
                 tenure_months, reason_for_leaving)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                candidate_id,
                job['company'],
                job['role'],
                job.get('start_date'),
                job.get('end_date'),
                tenure_months,
                job.get('reason_for_leaving')
            ))
            count += 1
        
        conn.commit()
        return count
    
    def get_risk_assessment(self, candidate_id: int) -> Optional[Dict[str, Any]]:
        """Get latest risk assessment for candidate"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, risk_score, risk_level, factors, recommendations, assessed_at
            FROM attrition_risk_scores
            WHERE candidate_id = ?
            ORDER BY assessed_at DESC
            LIMIT 1
        ''', (candidate_id,))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        return {
            'id': row[0],
            'risk_score': row[1],
            'risk_level': row[2],
            'factors': json.loads(row[3]) if row[3] else [],
            'recommendations': json.loads(row[4]) if row[4] else [],
            'assessed_at': row[5]
        }
    
    def get_high_risk_candidates(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get candidates with high attrition risk"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT ars.candidate_id, a.name, a.email, ars.risk_score, 
                   ars.risk_level, ars.assessed_at
            FROM attrition_risk_scores ars
            JOIN applicants a ON ars.candidate_id = a.id
            WHERE ars.risk_level IN ('high', 'medium')
            ORDER BY ars.risk_score DESC, ars.assessed_at DESC
            LIMIT ?
        ''', (limit,))
        
        candidates = []
        for row in cursor.fetchall():
            candidates.append({
                'candidate_id': row[0],
                'candidate_name': row[1],
                'candidate_email': row[2],
                'risk_score': row[3],
                'risk_level': row[4],
                'assessed_at': row[5]
            })
        
        return candidates
    
    def create_retention_intervention(self, candidate_id: int, intervention_type: str,
                                     description: str, scheduled_date: Optional[str] = None) -> int:
        """Create retention intervention plan"""
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO retention_interventions 
            (candidate_id, intervention_type, description, scheduled_date)
            VALUES (?, ?, ?, ?)
        ''', (candidate_id, intervention_type, description, scheduled_date))
        
        intervention_id = cursor.lastrowid
        conn.commit()
        
        return intervention_id
    
    def get_attrition_statistics(self) -> Dict[str, Any]:
        """Get overall attrition risk statistics"""
        conn = get_db()
        cursor = conn.cursor()
        
        # Risk level distribution
        cursor.execute('''
            SELECT risk_level, COUNT(*) as count
            FROM attrition_risk_scores
            WHERE id IN (
                SELECT MAX(id) FROM attrition_risk_scores GROUP BY candidate_id
            )
            GROUP BY risk_level
        ''')
        risk_distribution = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Average risk score
        cursor.execute('''
            SELECT AVG(risk_score) FROM attrition_risk_scores
            WHERE id IN (
                SELECT MAX(id) FROM attrition_risk_scores GROUP BY candidate_id
            )
        ''')
        avg_risk = cursor.fetchone()[0] or 0
        
        # Top risk factors
        cursor.execute('''
            SELECT factors FROM attrition_risk_scores
            WHERE id IN (
                SELECT MAX(id) FROM attrition_risk_scores GROUP BY candidate_id
            )
        ''')
        
        all_factors = []
        for row in cursor.fetchall():
            if row[0]:
                factors = json.loads(row[0])
                all_factors.extend([f['factor'] for f in factors])
        
        from collections import Counter
        factor_counts = Counter(all_factors).most_common(5)
        
        return {
            'risk_distribution': risk_distribution,
            'average_risk_score': round(avg_risk, 1),
            'total_assessed': sum(risk_distribution.values()),
            'top_risk_factors': [{'factor': f[0], 'count': f[1]} for f in factor_counts],
            'high_risk_count': risk_distribution.get('high', 0)
        }
