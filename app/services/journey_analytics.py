# app/services/journey_analytics.py
"""
Candidate Journey Analytics
Tracks every touchpoint from job view to hire, identifies drop-off points, A/B tests job descriptions
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
from app.services import db
import json

class JourneyAnalytics:
    """Track and analyze candidate journey through hiring funnel"""
    
    # Journey stages in order
    STAGES = [
        "viewed",        # Viewed job posting
        "applied",       # Started application
        "started_assessment",  # Began psychometric test
        "completed_assessment",  # Finished assessment
        "reviewed",      # Employer reviewed
        "interviewed",   # Interview scheduled/completed
        "offered",       # Job offer extended
        "hired"          # Accepted and hired
    ]
    
    def __init__(self):
        self._init_tables()
    
    def _init_tables(self):
        """Create tracking tables if they don't exist"""
        conn = db.get_db()
        
        # Touchpoint tracking
        conn.execute("""
            CREATE TABLE IF NOT EXISTS candidate_touchpoints (
                id TEXT PRIMARY KEY,
                candidate_id TEXT,
                role_id TEXT NOT NULL,
                employer_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                event_data TEXT,
                session_id TEXT,
                user_agent TEXT,
                ip_address TEXT,
                timestamp TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        
        # A/B test variants
        conn.execute("""
            CREATE TABLE IF NOT EXISTS job_variants (
                id TEXT PRIMARY KEY,
                role_id TEXT NOT NULL,
                employer_id TEXT NOT NULL,
                variant_name TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )
        """)
        
        # Variant performance
        conn.execute("""
            CREATE TABLE IF NOT EXISTS variant_metrics (
                id TEXT PRIMARY KEY,
                variant_id TEXT NOT NULL,
                role_id TEXT NOT NULL,
                views INTEGER DEFAULT 0,
                applications INTEGER DEFAULT 0,
                completions INTEGER DEFAULT 0,
                conversion_rate REAL DEFAULT 0.0,
                updated_at TEXT NOT NULL
            )
        """)
    
    async def track_event(
        self,
        event_type: str,
        role_id: str,
        employer_id: str,
        candidate_id: Optional[str] = None,
        event_data: Optional[Dict] = None,
        session_id: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> str:
        """Track a candidate journey event"""
        import uuid
        conn = db.get_db()
        
        event_id = str(uuid.uuid4())
        
        conn.execute("""
            INSERT INTO candidate_touchpoints (
                id, candidate_id, role_id, employer_id,
                event_type, event_data, session_id, user_agent,
                ip_address, timestamp, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            event_id, candidate_id, role_id, employer_id,
            event_type, json.dumps(event_data) if event_data else None,
            session_id, user_agent, ip_address,
            datetime.now().isoformat(), db.now_iso()
        ])
        
        # Update variant metrics if this is a variant view
        if event_type == "viewed" and event_data and "variant_id" in event_data:
            await self._update_variant_metrics(event_data["variant_id"], "view")
        elif event_type == "applied" and event_data and "variant_id" in event_data:
            await self._update_variant_metrics(event_data["variant_id"], "application")
        elif event_type == "completed_assessment" and event_data and "variant_id" in event_data:
            await self._update_variant_metrics(event_data["variant_id"], "completion")
        
        return event_id
    
    async def _update_variant_metrics(self, variant_id: str, metric_type: str):
        """Update A/B test variant metrics"""
        conn = db.get_db()
        
        # Get or create metrics record
        metrics = conn.execute("""
            SELECT * FROM variant_metrics WHERE variant_id = ?
        """, [variant_id]).fetchone()
        
        if not metrics:
            # Create new record
            import uuid
            conn.execute("""
                INSERT INTO variant_metrics (id, variant_id, role_id, updated_at)
                SELECT ?, ?, role_id, ?
                FROM job_variants WHERE id = ?
            """, [str(uuid.uuid4()), variant_id, db.now_iso(), variant_id])
            metrics = conn.execute("""
                SELECT * FROM variant_metrics WHERE variant_id = ?
            """, [variant_id]).fetchone()
        
        # Update counts
        if metric_type == "view":
            new_views = metrics["views"] + 1
            conn.execute("""
                UPDATE variant_metrics 
                SET views = ?, updated_at = ?
                WHERE variant_id = ?
            """, [new_views, db.now_iso(), variant_id])
        elif metric_type == "application":
            new_apps = metrics["applications"] + 1
            conn.execute("""
                UPDATE variant_metrics 
                SET applications = ?, updated_at = ?
                WHERE variant_id = ?
            """, [new_apps, db.now_iso(), variant_id])
        elif metric_type == "completion":
            new_comps = metrics["completions"] + 1
            conn.execute("""
                UPDATE variant_metrics 
                SET completions = ?, updated_at = ?
                WHERE variant_id = ?
            """, [new_comps, db.now_iso(), variant_id])
        
        # Recalculate conversion rate
        updated_metrics = conn.execute("""
            SELECT * FROM variant_metrics WHERE variant_id = ?
        """, [variant_id]).fetchone()
        
        if updated_metrics["views"] > 0:
            conversion_rate = (updated_metrics["completions"] / updated_metrics["views"]) * 100
            conn.execute("""
                UPDATE variant_metrics
                SET conversion_rate = ?
                WHERE variant_id = ?
            """, [conversion_rate, variant_id])
    
    async def get_funnel_data(
        self,
        employer_id: str,
        role_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict:
        """
        Get conversion funnel data
        
        Returns counts and conversion rates for each stage
        """
        conn = db.get_db()
        
        # Build query
        query = """
            SELECT event_type, COUNT(DISTINCT 
                CASE WHEN candidate_id IS NOT NULL THEN candidate_id 
                     ELSE session_id 
                END
            ) as count
            FROM candidate_touchpoints
            WHERE employer_id = ?
        """
        params = [employer_id]
        
        if role_id:
            query += " AND role_id = ?"
            params.append(role_id)
        
        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)
        
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)
        
        query += " GROUP BY event_type"
        
        results = conn.execute(query, params).fetchall()
        
        # Build funnel stages
        stage_counts = {stage: 0 for stage in self.STAGES}
        for row in results:
            if row["event_type"] in stage_counts:
                stage_counts[row["event_type"]] = row["count"]
        
        # Calculate conversion rates
        funnel_stages = []
        previous_count = None
        
        for stage in self.STAGES:
            count = stage_counts[stage]
            
            stage_data = {
                "stage": stage,
                "stage_name": self._stage_name(stage),
                "count": count,
                "conversion_from_previous": 0.0,
                "conversion_from_start": 0.0
            }
            
            if previous_count is not None and previous_count > 0:
                stage_data["conversion_from_previous"] = (count / previous_count) * 100
            
            if stage_counts["viewed"] > 0:
                stage_data["conversion_from_start"] = (count / stage_counts["viewed"]) * 100
            
            funnel_stages.append(stage_data)
            previous_count = count if count > 0 else previous_count
        
        # Calculate drop-off points
        drop_offs = []
        for i in range(len(funnel_stages) - 1):
            current = funnel_stages[i]
            next_stage = funnel_stages[i + 1]
            
            if current["count"] > 0:
                drop_off_rate = ((current["count"] - next_stage["count"]) / current["count"]) * 100
                if drop_off_rate > 20:  # Flag significant drop-offs
                    drop_offs.append({
                        "from_stage": current["stage_name"],
                        "to_stage": next_stage["stage_name"],
                        "drop_off_count": current["count"] - next_stage["count"],
                        "drop_off_rate": round(drop_off_rate, 2)
                    })
        
        return {
            "funnel_stages": funnel_stages,
            "drop_offs": drop_offs,
            "total_views": stage_counts["viewed"],
            "total_hired": stage_counts["hired"],
            "overall_conversion": (stage_counts["hired"] / stage_counts["viewed"] * 100) if stage_counts["viewed"] > 0 else 0
        }
    
    def _stage_name(self, stage: str) -> str:
        """Get human-readable stage name"""
        names = {
            "viewed": "Job Viewed",
            "applied": "Application Started",
            "started_assessment": "Assessment Started",
            "completed_assessment": "Assessment Completed",
            "reviewed": "Employer Reviewed",
            "interviewed": "Interviewed",
            "offered": "Offer Extended",
            "hired": "Hired"
        }
        return names.get(stage, stage.title())
    
    async def get_time_to_completion(
        self,
        employer_id: str,
        role_id: Optional[str] = None
    ) -> Dict:
        """Analyze how long candidates take at each stage"""
        conn = db.get_db()
        
        query = """
            SELECT 
                candidate_id,
                event_type,
                timestamp
            FROM candidate_touchpoints
            WHERE employer_id = ?
            AND candidate_id IS NOT NULL
        """
        params = [employer_id]
        
        if role_id:
            query += " AND role_id = ?"
            params.append(role_id)
        
        query += " ORDER BY candidate_id, timestamp ASC"
        
        events = conn.execute(query, params).fetchall()
        
        # Group by candidate
        candidate_timelines = defaultdict(list)
        for event in events:
            candidate_timelines[event["candidate_id"]].append({
                "event": event["event_type"],
                "time": datetime.fromisoformat(event["timestamp"])
            })
        
        # Calculate time between stages
        stage_durations = defaultdict(list)
        
        for candidate_id, timeline in candidate_timelines.items():
            for i in range(len(timeline) - 1):
                current = timeline[i]
                next_event = timeline[i + 1]
                
                duration_seconds = (next_event["time"] - current["time"]).total_seconds()
                stage_durations[f"{current['event']}_to_{next_event['event']}"].append(duration_seconds)
        
        # Calculate averages
        avg_durations = {}
        for stage, durations in stage_durations.items():
            if durations:
                avg_seconds = sum(durations) / len(durations)
                avg_durations[stage] = {
                    "average_seconds": round(avg_seconds, 2),
                    "average_hours": round(avg_seconds / 3600, 2),
                    "average_days": round(avg_seconds / 86400, 2),
                    "sample_size": len(durations)
                }
        
        return {
            "stage_durations": avg_durations,
            "total_candidates": len(candidate_timelines)
        }
    
    async def create_ab_test(
        self,
        role_id: str,
        employer_id: str,
        variants: List[Dict[str, str]]
    ) -> List[str]:
        """
        Create A/B test variants for a job posting
        
        variants = [
            {"name": "A", "title": "...", "description": "..."},
            {"name": "B", "title": "...", "description": "..."}
        ]
        """
        import uuid
        conn = db.get_db()
        
        variant_ids = []
        
        for variant in variants:
            variant_id = str(uuid.uuid4())
            
            conn.execute("""
                INSERT INTO job_variants (
                    id, role_id, employer_id, variant_name,
                    title, description, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, [
                variant_id, role_id, employer_id, variant["name"],
                variant["title"], variant["description"], db.now_iso()
            ])
            
            variant_ids.append(variant_id)
        
        return variant_ids
    
    async def get_ab_test_results(
        self,
        role_id: str,
        employer_id: str
    ) -> Dict:
        """Get A/B test performance comparison"""
        conn = db.get_db()
        
        variants = conn.execute("""
            SELECT 
                v.id, v.variant_name, v.title,
                m.views, m.applications, m.completions, m.conversion_rate
            FROM job_variants v
            LEFT JOIN variant_metrics m ON v.id = m.variant_id
            WHERE v.role_id = ? AND v.employer_id = ?
            AND v.is_active = 1
            ORDER BY v.created_at ASC
        """, [role_id, employer_id]).fetchall()
        
        results = []
        best_variant = None
        best_conversion = 0
        
        for variant in variants:
            variant_data = {
                "id": variant["id"],
                "name": variant["variant_name"],
                "title": variant["title"],
                "views": variant["views"] or 0,
                "applications": variant["applications"] or 0,
                "completions": variant["completions"] or 0,
                "conversion_rate": variant["conversion_rate"] or 0.0
            }
            
            results.append(variant_data)
            
            if variant_data["conversion_rate"] > best_conversion:
                best_conversion = variant_data["conversion_rate"]
                best_variant = variant_data
        
        return {
            "variants": results,
            "best_variant": best_variant,
            "total_variants": len(results)
        }

# Global instance
journey_analytics = JourneyAnalytics()
