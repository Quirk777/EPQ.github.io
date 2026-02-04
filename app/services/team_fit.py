# app/services/team_fit.py
"""
Team Fit Prediction Engine
Analyzes environmental preference compatibility between candidates and existing teams
Non-discriminatory: Based on work environment preferences, not personal characteristics
"""
from typing import Dict, List, Optional, Tuple
import math
from app.services import db

class TeamFitAnalyzer:
    """Analyzes team environmental compatibility using psychometric constructs"""
    
    # 8 Environmental Constructs (work environment preferences)
    CONSTRUCTS = [
        "SCL",  # Structure/Clarity Level
        "CCD",  # Collaborative/Competitive Dynamics
        "CIL",  # Change/Innovation Level
        "CVL",  # Communication Volume Level
        "ERL",  # Emotional Responsiveness Level
        "MSD",  # Meaning/Social-impact Driven
        "ICI",  # Individual Contribution Importance
        "AJL"   # Autonomy/Judgment Level
    ]
    
    def __init__(self):
        self.construct_weights = {
            "SCL": 1.2,  # Structure compatibility is critical
            "CCD": 1.3,  # Collaboration style very important
            "CIL": 1.0,  # Innovation preference moderate importance
            "CVL": 0.9,  # Communication style less critical
            "ERL": 0.8,  # Emotional style less critical
            "MSD": 1.0,  # Values alignment moderate importance
            "ICI": 1.1,  # Work style important
            "AJL": 1.2   # Autonomy needs critical
        }
    
    async def get_team_profile(
        self,
        employer_id: str,
        role_id: Optional[str] = None
    ) -> Dict:
        """
        Get aggregated environmental profile of existing team
        
        Returns:
        - Average scores for each construct
        - Standard deviation (shows team diversity)
        - Team size
        - Individual member profiles
        """
        conn = db.get_db()
        
        # Get all completed assessments for this employer
        # If role_id provided, filter by department/role
        query = """
            SELECT 
                a.id,
                a.name,
                a.role_id,
                s.scl, s.ccd, s.cil, s.cvl, s.erl, s.msd, s.ici, s.ajl
            FROM applicants a
            JOIN submissions s ON a.id = s.applicant_id
            WHERE a.employer_id = ?
            AND s.completed = 1
            AND a.status = 'hired'
        """
        params = [employer_id]
        
        if role_id:
            query += " AND a.role_id = ?"
            params.append(role_id)
        
        team_members = conn.execute(query, params).fetchall()
        
        if not team_members:
            return {
                "team_size": 0,
                "averages": {},
                "std_devs": {},
                "members": []
            }
        
        # Calculate averages and std deviations for each construct
        construct_values = {c: [] for c in self.CONSTRUCTS}
        
        for member in team_members:
            for construct in self.CONSTRUCTS:
                value = member[construct.lower()]
                if value is not None:
                    construct_values[construct].append(value)
        
        averages = {}
        std_devs = {}
        
        for construct in self.CONSTRUCTS:
            values = construct_values[construct]
            if values:
                avg = sum(values) / len(values)
                variance = sum((x - avg) ** 2 for x in values) / len(values)
                std_dev = math.sqrt(variance)
                
                averages[construct] = round(avg, 2)
                std_devs[construct] = round(std_dev, 2)
            else:
                averages[construct] = 0
                std_devs[construct] = 0
        
        return {
            "team_size": len(team_members),
            "averages": averages,
            "std_devs": std_devs,
            "members": [
                {
                    "id": m["id"],
                    "name": m["name"],
                    "scores": {c: m[c.lower()] for c in self.CONSTRUCTS}
                }
                for m in team_members
            ]
        }
    
    async def calculate_fit_score(
        self,
        candidate_id: str,
        employer_id: str,
        role_id: Optional[str] = None
    ) -> Dict:
        """
        Calculate how well candidate's environmental preferences fit the team
        
        Returns:
        - Overall fit score (0-100)
        - Construct-by-construct comparison
        - Diversity impact (how candidate would shift team dynamics)
        - Strengths and concerns
        """
        conn = db.get_db()
        
        # Get candidate scores
        candidate = conn.execute("""
            SELECT 
                a.name,
                s.scl, s.ccd, s.cil, s.cvl, s.erl, s.msd, s.ici, s.ajl
            FROM applicants a
            JOIN submissions s ON a.id = s.applicant_id
            WHERE a.id = ?
            AND s.completed = 1
            ORDER BY s.completed_at DESC
            LIMIT 1
        """, [candidate_id]).fetchone()
        
        if not candidate:
            raise ValueError("Candidate assessment not found")
        
        # Get team profile
        team_profile = await self.get_team_profile(employer_id, role_id)
        
        if team_profile["team_size"] == 0:
            return {
                "fit_score": 50,  # Neutral when no team data
                "message": "No existing team data - candidate would be first hire",
                "construct_comparison": {},
                "diversity_impact": {}
            }
        
        # Calculate fit for each construct
        construct_fits = {}
        weighted_diffs = []
        
        for construct in self.CONSTRUCTS:
            candidate_score = candidate[construct.lower()]
            team_avg = team_profile["averages"][construct]
            team_std = team_profile["std_devs"][construct]
            
            # Calculate difference
            diff = abs(candidate_score - team_avg)
            
            # Normalize difference (0-10 scale becomes 0-1)
            normalized_diff = diff / 10.0
            
            # Convert to fit score (closer = better fit)
            # But some diversity is good (within 1 std dev is ideal)
            if diff <= team_std:
                # Within acceptable diversity range
                fit = 100
            elif diff <= team_std * 2:
                # Moderate diversity
                fit = 100 - (normalized_diff * 30)
            else:
                # High diversity - could be challenging
                fit = 100 - (normalized_diff * 50)
            
            fit = max(0, min(100, fit))
            
            construct_fits[construct] = {
                "candidate_score": candidate_score,
                "team_average": team_avg,
                "team_std_dev": team_std,
                "difference": round(diff, 2),
                "fit_score": round(fit, 2),
                "interpretation": self._interpret_fit(diff, team_std)
            }
            
            # Add to weighted calculation
            weight = self.construct_weights[construct]
            weighted_diffs.append(fit * weight)
        
        # Calculate overall fit score (weighted average)
        total_weight = sum(self.construct_weights.values())
        overall_fit = sum(weighted_diffs) / total_weight
        
        # Calculate diversity impact
        diversity_impact = self._calculate_diversity_impact(
            candidate, team_profile
        )
        
        # Generate insights
        insights = self._generate_insights(
            construct_fits, overall_fit, diversity_impact
        )
        
        return {
            "fit_score": round(overall_fit, 2),
            "candidate_name": candidate["name"],
            "team_size": team_profile["team_size"],
            "construct_comparison": construct_fits,
            "diversity_impact": diversity_impact,
            "insights": insights
        }
    
    def _interpret_fit(self, diff: float, std_dev: float) -> str:
        """Interpret construct fit difference"""
        if diff <= std_dev * 0.5:
            return "Strong alignment - very similar to team average"
        elif diff <= std_dev:
            return "Good fit - within team's normal range"
        elif diff <= std_dev * 1.5:
            return "Moderate fit - adds healthy diversity"
        elif diff <= std_dev * 2:
            return "Notable difference - significant diversity"
        else:
            return "High divergence - may face adaptation challenges"
    
    def _calculate_diversity_impact(
        self,
        candidate: Dict,
        team_profile: Dict
    ) -> Dict:
        """
        Calculate how candidate would change team dynamics
        
        Shows which dimensions candidate would shift and by how much
        """
        impact = {}
        
        for construct in self.CONSTRUCTS:
            candidate_score = candidate[construct.lower()]
            team_avg = team_profile["averages"][construct]
            
            # Calculate new average if candidate joins
            new_avg = (team_avg * team_profile["team_size"] + candidate_score) / (team_profile["team_size"] + 1)
            shift = new_avg - team_avg
            
            impact[construct] = {
                "current_avg": team_avg,
                "new_avg": round(new_avg, 2),
                "shift": round(shift, 2),
                "direction": "increase" if shift > 0 else "decrease" if shift < 0 else "neutral",
                "magnitude": "high" if abs(shift) > 0.5 else "medium" if abs(shift) > 0.2 else "low"
            }
        
        return impact
    
    def _generate_insights(
        self,
        construct_fits: Dict,
        overall_fit: float,
        diversity_impact: Dict
    ) -> Dict:
        """Generate human-readable insights about team fit"""
        
        # Find strengths (top 3 best fits)
        sorted_fits = sorted(
            construct_fits.items(),
            key=lambda x: x[1]["fit_score"],
            reverse=True
        )
        
        strengths = []
        for construct, data in sorted_fits[:3]:
            strengths.append({
                "construct": construct,
                "message": f"{self._construct_name(construct)}: {data['interpretation']}"
            })
        
        # Find concerns (bottom 3 fits)
        concerns = []
        for construct, data in sorted_fits[-3:]:
            if data["fit_score"] < 70:  # Only flag if below threshold
                concerns.append({
                    "construct": construct,
                    "message": f"{self._construct_name(construct)}: {data['interpretation']}"
                })
        
        # Overall assessment
        if overall_fit >= 85:
            assessment = "Excellent environmental fit - candidate's preferences align very well with team"
        elif overall_fit >= 70:
            assessment = "Good fit - candidate would integrate well with healthy diversity"
        elif overall_fit >= 55:
            assessment = "Moderate fit - some adaptation needed but manageable"
        else:
            assessment = "Lower fit - significant environmental differences may require support"
        
        # Diversity contribution
        high_impact_areas = [
            construct for construct, data in diversity_impact.items()
            if data["magnitude"] in ["high", "medium"]
        ]
        
        if high_impact_areas:
            diversity_note = f"Would add meaningful diversity in: {', '.join([self._construct_name(c) for c in high_impact_areas[:3]])}"
        else:
            diversity_note = "Would maintain current team environmental balance"
        
        return {
            "overall_assessment": assessment,
            "strengths": strengths,
            "concerns": concerns,
            "diversity_note": diversity_note
        }
    
    def _construct_name(self, code: str) -> str:
        """Get human-readable construct name"""
        names = {
            "SCL": "Structure Preference",
            "CCD": "Collaboration Style",
            "CIL": "Innovation Orientation",
            "CVL": "Communication Style",
            "ERL": "Emotional Expression",
            "MSD": "Values Alignment",
            "ICI": "Work Style",
            "AJL": "Autonomy Preference"
        }
        return names.get(code, code)
    
    async def compare_candidates(
        self,
        candidate_ids: List[str],
        employer_id: str,
        role_id: Optional[str] = None
    ) -> Dict:
        """
        Compare multiple candidates' team fit
        Useful for final selection decisions
        """
        results = []
        
        for candidate_id in candidate_ids:
            try:
                fit_analysis = await self.calculate_fit_score(
                    candidate_id, employer_id, role_id
                )
                results.append(fit_analysis)
            except ValueError:
                continue
        
        # Rank by fit score
        results.sort(key=lambda x: x["fit_score"], reverse=True)
        
        return {
            "comparisons": results,
            "best_fit": results[0] if results else None,
            "analyzed_count": len(results)
        }

# Global instance
team_fit_analyzer = TeamFitAnalyzer()
