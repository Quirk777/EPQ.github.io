# app/services/bias_detection.py
"""
Enhanced bias detection for candidate notes and feedback.
Provides context-aware warnings and educational prompts.
"""
from typing import Optional, List, Dict
import re

class BiasPattern:
    def __init__(self, pattern: str, category: str, warning: str, education: str, is_regex: bool = False):
        self.pattern = pattern if is_regex else re.escape(pattern.lower())
        self.category = category
        self.warning = warning
        self.education = education
        self.is_regex = is_regex

# Comprehensive bias patterns
BIAS_PATTERNS = [
    # Age bias
    BiasPattern(
        r"\b(young|old|age|elderly|mature|millennial|gen z|boomer)\b",
        "age",
        "This note mentions age-related terms.",
        "Age discrimination is illegal. Focus on: Years of experience, skill proficiency, specific achievements. Instead of 'young and energetic', try 'demonstrates initiative and adaptability'.",
        is_regex=True
    ),
    
    # Culture fit bias
    BiasPattern(
        r"\b(culture fit|cultural fit|fits our culture|good fit)\b",
        "culture_fit",
        "'Culture fit' can mask unconscious bias.",
        "'Culture fit' often reflects personal preferences rather than job requirements. Use 'environment alignment' instead: Does the candidate thrive in our specific work environment (autonomy level, pace, structure)? Be specific about behaviors, not vibes.",
        is_regex=True
    ),
    
    # Personality bias
    BiasPattern(
        r"\b(personality|likeable|friendly|nice|warm|charismatic|charming)\b",
        "personality",
        "This focuses on personal traits rather than work behaviors.",
        "Personality preferences can introduce bias. Focus on: Observable work behaviors, communication skills in specific contexts, collaboration effectiveness. Instead of 'likeable personality', try 'communicates clearly and collaborates effectively'.",
        is_regex=True
    ),
    
    # Gendered language
    BiasPattern(
        r"\b(aggressive|assertive|abrasive|bossy|emotional|hysterical|sensitive)\b",
        "gendered_language",
        "These terms may carry gender bias.",
        "Studies show these terms are applied differently by gender. Use: Specific behaviors and impacts. Instead of 'aggressive', try 'direct in communication' or 'strong advocate for their position'. Instead of 'emotional', describe the specific situation.",
        is_regex=True
    ),
    
    # Appearance bias
    BiasPattern(
        r"\b(attractive|professional appearance|well-dressed|polished|groomed)\b",
        "appearance",
        "Appearance mentions can introduce bias.",
        "Unless appearance is a bona fide job requirement, avoid mentioning it. Focus on: Job-relevant skills, communication effectiveness, work samples. If presentation skills matter, assess them in context (e.g., 'delivered clear, well-structured presentation').",
        is_regex=True
    ),
    
    # Family status bias
    BiasPattern(
        r"\b(kids|children|family|married|single|parent|mother|father)\b",
        "family_status",
        "Family status is not job-relevant and may introduce bias.",
        "Family status is protected in many jurisdictions and irrelevant to job performance. Focus on: Availability for required schedule, ability to travel if needed (don't assume based on family status), commitment to role.",
        is_regex=True
    ),
    
    # Accent/origin bias
    BiasPattern(
        r"\b(accent|foreign|native|immigrant|international)\b",
        "accent_origin",
        "References to accent or origin can be discriminatory.",
        "Unless language proficiency is job-essential, don't mention accent or origin. If communication is important: Assess clarity of written communication, effectiveness in meetings, ability to convey technical concepts. Focus on the outcome, not the accent.",
        is_regex=True
    ),
    
    # Education bias
    BiasPattern(
        r"\b(ivy league|prestigious|elite school|top tier university)\b",
        "education_prestige",
        "School prestige can introduce class bias.",
        "School name is less predictive than actual skills. Focus on: Relevant knowledge demonstrated, problem-solving in interviews, work samples and projects. Education prestige often correlates with socioeconomic background, not ability.",
        is_regex=True
    ),
    
    # Gut feeling bias
    BiasPattern(
        r"\b(gut feeling|instinct|vibe|feeling|sense that|intuition)\b",
        "gut_feeling",
        "Gut feelings often mask unconscious bias.",
        "Intuition is often unconscious pattern matching that can include bias. Instead: Identify specific observations that led to your feeling, use structured evaluation criteria, gather multiple perspectives. What specific behaviors or responses concerned you?",
        is_regex=True
    ),
    
    # Overqualified bias
    BiasPattern(
        r"\b(overqualified|too experienced|too senior)\b",
        "overqualified",
        "'Overqualified' can mask age or other biases.",
        "'Overqualified' is often code for age bias or unfounded assumptions. Ask yourself: Did they express genuine interest? Are you assuming they'll leave (or are you projecting)? Would you have this concern about a younger candidate with the same experience?",
        is_regex=True
    ),
]

def detect_bias(text: str) -> Optional[Dict[str, any]]:
    """
    Detect bias patterns in text and return detailed feedback.
    
    Returns:
        None if no bias detected
        Dict with category, warning, education, and matched_terms if bias found
    """
    if not text:
        return None
    
    text_lower = text.lower()
    matched_patterns = []
    
    for pattern in BIAS_PATTERNS:
        if pattern.is_regex:
            matches = re.findall(pattern.pattern, text_lower)
            if matches:
                matched_patterns.append({
                    "category": pattern.category,
                    "warning": pattern.warning,
                    "education": pattern.education,
                    "matched_terms": list(set(matches))
                })
    
    # Return the first match (or could combine multiple)
    if matched_patterns:
        result = matched_patterns[0]
        # If multiple categories detected, note it
        if len(matched_patterns) > 1:
            result["additional_concerns"] = [p["category"] for p in matched_patterns[1:]]
        return result
    
    return None

def get_bias_score(text: str) -> int:
    """
    Calculate a bias score (0-100) based on number and severity of bias indicators.
    Higher scores indicate more potential bias.
    """
    if not text:
        return 0
    
    text_lower = text.lower()
    score = 0
    
    for pattern in BIAS_PATTERNS:
        if pattern.is_regex:
            matches = re.findall(pattern.pattern, text_lower)
            if matches:
                # High severity patterns
                if pattern.category in ["age", "family_status", "accent_origin"]:
                    score += 20 * len(set(matches))
                # Medium severity
                elif pattern.category in ["culture_fit", "gendered_language", "gut_feeling"]:
                    score += 15 * len(set(matches))
                # Lower severity (still problematic)
                else:
                    score += 10 * len(set(matches))
    
    return min(score, 100)

def suggest_alternative(text: str, category: str) -> Optional[str]:
    """
    Suggest an alternative phrasing for biased text.
    """
    alternatives = {
        "age": "Consider: 'X years of experience in [domain]' or 'demonstrated proficiency in [skill]'",
        "culture_fit": "Consider: 'aligns with our work environment needs: [specific dimension like autonomy, pace, collaboration]'",
        "personality": "Consider: 'demonstrates [specific behavior] in [context]' or 'effectively [specific skill]'",
        "gendered_language": "Consider describing the specific behavior and its impact without judgment",
        "gut_feeling": "Consider: 'Based on [specific observation], I have concerns about [specific skill/fit]'",
        "family_status": "Consider: Focus on availability and commitment without referencing family",
        "accent_origin": "Consider: If communication is important, assess effectiveness, not accent",
        "appearance": "Consider: Focus on job-relevant skills and behaviors only",
        "education_prestige": "Consider: 'demonstrated strong knowledge of [specific area]' or 'solved [specific problem]'",
        "overqualified": "Consider: Ask directly about their interest and career goals"
    }
    
    return alternatives.get(category)
