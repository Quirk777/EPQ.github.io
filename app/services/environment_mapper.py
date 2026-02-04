# app/services/environment_mapper.py
"""
Map psychometric construct scores to environment dimensions.
"""
from typing import Dict

def map_constructs_to_environment(construct_scores: Dict[str, float]) -> Dict[str, int]:
    """
    Convert psychometric construct scores (1-4 scale) to environment dimension scores (0-100 scale).
    
    Constructs:
    - SCL: Structural Clarity Load
    - CCD: Cognitive Compression Demand  
    - CIL: Complexity Integration Load
    - CVL: Change Volatility Load
    - ERL: Emotional Regulation Load
    - MSD: Motivational Sustainment Demand
    - ICI: Interpersonal Coordination Intensity
    - AJL: Autonomy & Judgment Load
    
    Environment Dimensions:
    - autonomy: How much independence preferred
    - pace: Preferred work speed/pressure
    - structure: Need for clear processes
    - collaboration: Preference for team interaction
    - innovation: Comfort with change/creativity
    - ambiguity: Tolerance for unclear situations
    """
    
    # Get construct values (default to 2.5 = moderate)
    scl = construct_scores.get("SCL", 2.5)  # Structural Clarity Load
    ccd = construct_scores.get("CCD", 2.5)  # Cognitive Compression Demand
    cil = construct_scores.get("CIL", 2.5)  # Complexity Integration Load
    cvl = construct_scores.get("CVL", 2.5)  # Change Volatility Load
    erl = construct_scores.get("ERL", 2.5)  # Emotional Regulation Load
    msd = construct_scores.get("MSD", 2.5)  # Motivational Sustainment Demand
    ici = construct_scores.get("ICI", 2.5)  # Interpersonal Coordination Intensity
    ajl = construct_scores.get("AJL", 2.5)  # Autonomy & Judgment Load
    
    # Convert 1-4 scale to 0-100 scale
    def scale_to_100(value: float) -> int:
        """Convert 1-4 scale to 0-100, where 1=0% and 4=100%"""
        return int(((value - 1) / 3) * 100)
    
    # Calculate environment dimensions
    # Higher AJL = Higher autonomy preference
    autonomy = scale_to_100(ajl)
    
    # Higher CCD + CIL = Higher pace tolerance (can handle fast/dense info)
    pace = scale_to_100((ccd + cil) / 2)
    
    # Higher SCL = Higher structure preference (needs clarity)
    structure = scale_to_100(scl)
    
    # Higher ICI + Lower ERL = Higher collaboration preference
    # (High ICI = likes coordination, Low ERL = comfortable with social interaction)
    collaboration = scale_to_100((ici + (5 - erl)) / 2)
    
    # Higher CVL + Lower SCL = Higher innovation tolerance
    # (High CVL = comfortable with change, Low SCL = less need for rigid process)
    innovation = scale_to_100((cvl + (5 - scl)) / 2)
    
    # Higher CIL + Lower SCL = Higher ambiguity tolerance
    # (High CIL = can integrate complex factors, Low SCL = doesn't need everything defined)
    ambiguity = scale_to_100((cil + (5 - scl)) / 2)
    
    return {
        "autonomy": autonomy,
        "pace": pace,
        "structure": structure,
        "collaboration": collaboration,
        "innovation": innovation,
        "ambiguity": ambiguity
    }
