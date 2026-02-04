# app/services/assessment_builder.py
"""
Custom Assessment Builder
Create, customize, and manage psychometric assessment templates
Includes industry templates and white-label capabilities
"""
from typing import Dict, List, Optional
from app.services import db
import json

class AssessmentBuilder:
    """Manage custom assessment templates"""
    
    # Pre-built industry templates
    INDUSTRY_TEMPLATES = {
        "tech": {
            "name": "Technology & Engineering",
            "description": "Optimized for software engineers, developers, and tech roles",
            "focus_constructs": ["CIL", "AJL", "ICI", "SCL"],
            "question_count": 40,
            "time_estimate": 15
        },
        "sales": {
            "name": "Sales & Business Development",
            "description": "Tailored for sales professionals and client-facing roles",
            "focus_constructs": ["CCD", "CVL", "ERL", "MSD"],
            "question_count": 35,
            "time_estimate": 12
        },
        "healthcare": {
            "name": "Healthcare & Medical",
            "description": "Designed for healthcare professionals and caregivers",
            "focus_constructs": ["ERL", "MSD", "SCL", "CCD"],
            "question_count": 45,
            "time_estimate": 18
        },
        "leadership": {
            "name": "Leadership & Management",
            "description": "For managers, directors, and executive roles",
            "focus_constructs": ["AJL", "CCD", "MSD", "CIL"],
            "question_count": 50,
            "time_estimate": 20
        },
        "customer_service": {
            "name": "Customer Service & Support",
            "description": "Customer-facing support and service roles",
            "focus_constructs": ["ERL", "CVL", "CCD", "SCL"],
            "question_count": 35,
            "time_estimate": 12
        }
    }
    
    # Question bank organized by construct
    QUESTION_BANK = {
        "SCL": [
            {"id": "scl_1", "text": "I prefer working with clear, well-defined processes", "type": "agreement"},
            {"id": "scl_2", "text": "I thrive in environments with structured guidelines", "type": "agreement"},
            {"id": "scl_3", "text": "Ambiguous tasks energize me more than structured ones", "type": "agreement", "reverse": True},
            {"id": "scl_4", "text": "I work best when expectations are clearly communicated", "type": "agreement"},
            {"id": "scl_5", "text": "I enjoy creating order out of chaos", "type": "agreement"}
        ],
        "CCD": [
            {"id": "ccd_1", "text": "I prefer working as part of a team", "type": "agreement"},
            {"id": "ccd_2", "text": "Collaborative projects bring out my best work", "type": "agreement"},
            {"id": "ccd_3", "text": "I excel in competitive environments", "type": "agreement"},
            {"id": "ccd_4", "text": "I prefer individual recognition over team recognition", "type": "agreement", "reverse": True},
            {"id": "ccd_5", "text": "Team success matters more to me than individual achievement", "type": "agreement"}
        ],
        "CIL": [
            {"id": "cil_1", "text": "I actively seek out innovative solutions", "type": "agreement"},
            {"id": "cil_2", "text": "I'm energized by change and new challenges", "type": "agreement"},
            {"id": "cil_3", "text": "I prefer stability over constant innovation", "type": "agreement", "reverse": True},
            {"id": "cil_4", "text": "I enjoy experimenting with new approaches", "type": "agreement"},
            {"id": "cil_5", "text": "Disrupting the status quo appeals to me", "type": "agreement"}
        ],
        "CVL": [
            {"id": "cvl_1", "text": "I prefer frequent communication with colleagues", "type": "agreement"},
            {"id": "cvl_2", "text": "I work best with regular feedback and interaction", "type": "agreement"},
            {"id": "cvl_3", "text": "I prefer minimal interruptions during work", "type": "agreement", "reverse": True},
            {"id": "cvl_4", "text": "Brainstorming sessions energize me", "type": "agreement"},
            {"id": "cvl_5", "text": "I value regular check-ins with my team", "type": "agreement"}
        ],
        "ERL": [
            {"id": "erl_1", "text": "I naturally express my emotions at work", "type": "agreement"},
            {"id": "erl_2", "text": "I value emotional connections with colleagues", "type": "agreement"},
            {"id": "erl_3", "text": "I prefer keeping emotions separate from work", "type": "agreement", "reverse": True},
            {"id": "erl_4", "text": "I'm comfortable discussing feelings in professional settings", "type": "agreement"},
            {"id": "erl_5", "text": "Empathy is crucial in my work relationships", "type": "agreement"}
        ],
        "MSD": [
            {"id": "msd_1", "text": "Making a social impact is important to me", "type": "agreement"},
            {"id": "msd_2", "text": "I'm motivated by work that serves a greater purpose", "type": "agreement"},
            {"id": "msd_3", "text": "Task completion matters more than broader impact", "type": "agreement", "reverse": True},
            {"id": "msd_4", "text": "I seek roles that contribute to societal good", "type": "agreement"},
            {"id": "msd_5", "text": "Meaningful work energizes me more than high pay", "type": "agreement"}
        ],
        "ICI": [
            {"id": "ici_1", "text": "I prefer working independently", "type": "agreement"},
            {"id": "ici_2", "text": "My best work comes from solo efforts", "type": "agreement"},
            {"id": "ici_3", "text": "I thrive when my individual contributions are recognized", "type": "agreement"},
            {"id": "ici_4", "text": "I prefer collaborative projects over solo work", "type": "agreement", "reverse": True},
            {"id": "ici_5", "text": "Self-directed projects appeal to me", "type": "agreement"}
        ],
        "AJL": [
            {"id": "ajl_1", "text": "I prefer making my own decisions without oversight", "type": "agreement"},
            {"id": "ajl_2", "text": "I work best with autonomy and independence", "type": "agreement"},
            {"id": "ajl_3", "text": "I value guidance and direction from supervisors", "type": "agreement", "reverse": True},
            {"id": "ajl_4", "text": "I excel when given freedom to choose my approach", "type": "agreement"},
            {"id": "ajl_5", "text": "Self-management is my preferred work style", "type": "agreement"}
        ]
    }
    
    def __init__(self):
        self._init_tables()
    
    def _init_tables(self):
        """Create assessment template tables"""
        conn = db.get_db()
        
        # Custom assessment templates
        conn.execute("""
            CREATE TABLE IF NOT EXISTS assessment_templates (
                id TEXT PRIMARY KEY,
                employer_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                industry TEXT,
                questions TEXT NOT NULL,
                construct_weights TEXT,
                time_estimate INTEGER,
                is_active INTEGER DEFAULT 1,
                is_public INTEGER DEFAULT 0,
                white_label_name TEXT,
                white_label_logo TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Template usage tracking
        conn.execute("""
            CREATE TABLE IF NOT EXISTS template_usage (
                id TEXT PRIMARY KEY,
                template_id TEXT NOT NULL,
                employer_id TEXT NOT NULL,
                role_id TEXT,
                candidate_count INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
        """)
    
    async def create_template(
        self,
        employer_id: str,
        name: str,
        description: Optional[str] = None,
        industry: Optional[str] = None,
        questions: List[Dict] = [],
        construct_weights: Optional[Dict[str, float]] = None,
        white_label_name: Optional[str] = None
    ) -> str:
        """Create a new assessment template"""
        import uuid
        conn = db.get_db()
        
        template_id = str(uuid.uuid4())
        
        # Calculate time estimate (rough: 20 seconds per question)
        time_estimate = len(questions) * 20 // 60  # minutes
        
        # Default equal weights if not provided
        if not construct_weights:
            construct_weights = {c: 1.0 for c in ["SCL", "CCD", "CIL", "CVL", "ERL", "MSD", "ICI", "AJL"]}
        
        conn.execute("""
            INSERT INTO assessment_templates (
                id, employer_id, name, description, industry,
                questions, construct_weights, time_estimate,
                white_label_name, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            template_id, employer_id, name, description, industry,
            json.dumps(questions), json.dumps(construct_weights),
            time_estimate, white_label_name, db.now_iso(), db.now_iso()
        ])
        
        return template_id
    
    async def get_template(self, template_id: str, employer_id: str) -> Dict:
        """Get template details"""
        conn = db.get_db()
        
        template = conn.execute("""
            SELECT * FROM assessment_templates
            WHERE id = ? AND (employer_id = ? OR is_public = 1)
        """, [template_id, employer_id]).fetchone()
        
        if not template:
            raise ValueError("Template not found")
        
        return {
            "id": template["id"],
            "name": template["name"],
            "description": template["description"],
            "industry": template["industry"],
            "questions": json.loads(template["questions"]),
            "construct_weights": json.loads(template["construct_weights"]) if template["construct_weights"] else {},
            "time_estimate": template["time_estimate"],
            "is_active": bool(template["is_active"]),
            "is_public": bool(template["is_public"]),
            "white_label_name": template["white_label_name"],
            "white_label_logo": template["white_label_logo"]
        }
    
    async def list_templates(self, employer_id: str, include_public: bool = True) -> List[Dict]:
        """List all available templates"""
        conn = db.get_db()
        
        query = """
            SELECT id, name, description, industry, time_estimate, 
                   is_active, is_public, white_label_name
            FROM assessment_templates
            WHERE employer_id = ?
        """
        params = [employer_id]
        
        if include_public:
            query += " OR is_public = 1"
        
        query += " ORDER BY created_at DESC"
        
        templates = conn.execute(query, params).fetchall()
        
        return [
            {
                "id": t["id"],
                "name": t["name"],
                "description": t["description"],
                "industry": t["industry"],
                "time_estimate": t["time_estimate"],
                "is_active": bool(t["is_active"]),
                "is_public": bool(t["is_public"]),
                "white_label_name": t["white_label_name"]
            }
            for t in templates
        ]
    
    async def create_from_industry_template(
        self,
        employer_id: str,
        industry_key: str,
        custom_name: Optional[str] = None
    ) -> str:
        """Create assessment from industry template"""
        if industry_key not in self.INDUSTRY_TEMPLATES:
            raise ValueError(f"Invalid industry template: {industry_key}")
        
        template = self.INDUSTRY_TEMPLATES[industry_key]
        
        # Select questions based on focus constructs
        questions = []
        questions_per_construct = template["question_count"] // len(template["focus_constructs"])
        
        for construct in template["focus_constructs"]:
            if construct in self.QUESTION_BANK:
                questions.extend(self.QUESTION_BANK[construct][:questions_per_construct])
        
        # Add some questions from other constructs for balance
        remaining_constructs = [c for c in self.QUESTION_BANK.keys() if c not in template["focus_constructs"]]
        for construct in remaining_constructs[:2]:  # Add 2 more constructs
            questions.extend(self.QUESTION_BANK[construct][:3])
        
        # Create weights favoring focus constructs
        weights = {}
        for construct in template["focus_constructs"]:
            weights[construct] = 1.5
        for construct in remaining_constructs:
            weights[construct] = 1.0
        
        name = custom_name or template["name"]
        
        return await self.create_template(
            employer_id=employer_id,
            name=name,
            description=template["description"],
            industry=industry_key,
            questions=questions,
            construct_weights=weights
        )
    
    async def update_template(
        self,
        template_id: str,
        employer_id: str,
        **updates
    ) -> bool:
        """Update template fields"""
        conn = db.get_db()
        
        allowed_fields = ["name", "description", "questions", "construct_weights", "is_active", "white_label_name", "white_label_logo"]
        
        update_parts = []
        values = []
        
        for field, value in updates.items():
            if field in allowed_fields:
                if field in ["questions", "construct_weights"] and value:
                    value = json.dumps(value)
                update_parts.append(f"{field} = ?")
                values.append(value)
        
        if not update_parts:
            return False
        
        update_parts.append("updated_at = ?")
        values.append(db.now_iso())
        
        values.extend([employer_id, template_id])
        
        conn.execute(f"""
            UPDATE assessment_templates
            SET {', '.join(update_parts)}
            WHERE employer_id = ? AND id = ?
        """, values)
        
        return True
    
    async def delete_template(self, template_id: str, employer_id: str) -> bool:
        """Delete template"""
        conn = db.get_db()
        
        result = conn.execute("""
            DELETE FROM assessment_templates
            WHERE id = ? AND employer_id = ?
        """, [template_id, employer_id])
        
        return result.rowcount > 0
    
    async def get_question_bank(self) -> Dict[str, List[Dict]]:
        """Get all available questions organized by construct"""
        return self.QUESTION_BANK
    
    async def get_industry_templates(self) -> Dict:
        """Get all industry template definitions"""
        return self.INDUSTRY_TEMPLATES
    
    async def track_usage(self, template_id: str, employer_id: str, role_id: Optional[str] = None):
        """Track template usage"""
        import uuid
        conn = db.get_db()
        
        usage_id = str(uuid.uuid4())
        
        conn.execute("""
            INSERT INTO template_usage (
                id, template_id, employer_id, role_id, created_at
            ) VALUES (?, ?, ?, ?, ?)
        """, [usage_id, template_id, employer_id, role_id, db.now_iso()])

# Global instance
assessment_builder = AssessmentBuilder()
