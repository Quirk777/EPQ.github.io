from typing import Dict, List

# Employer EPQ: 20 questions, 4 choices each
# Returned to frontend as a normalized structure for rendering.

QUESTIONS: List[dict] = [
    {
        "id": "E1",
        "text": "Role Structure\nHow clearly defined are expectations, processes, and success criteria for this role?",
        "choices": [
            "Very clearly defined, little interpretation needed",
            "Mostly defined with some flexibility",
            "Broad goals, methods vary",
            "Largely undefined, requires self-direction",
        ],
    },
    {
        "id": "E2",
        "text": "Change Frequency\nHow often do priorities, tools, or expectations shift for this role?",
        "choices": ["Rarely", "Occasionally", "Frequently", "Constantly"],
    },
    {
        "id": "E3",
        "text": "Autonomy Level\nHow much independence does this role have in making day-to-day decisions?",
        "choices": [
            "Very little, decisions are directed",
            "Some independence within guidelines",
            "High independence with accountability",
            "Nearly full autonomy",
        ],
    },
    {
        "id": "E4",
        "text": "Interpersonal Exposure\nHow much interaction with coworkers, clients, or customers is required?",
        "choices": [
            "Minimal interaction",
            "Regular internal interaction",
            "Frequent collaboration or customer contact",
            "Constant interaction or relationship management",
        ],
    },
    {
        "id": "E5",
        "text": "Pace & Pressure\nHow would you describe the typical pace and performance pressure of this role?",
        "choices": [
            "Steady and predictable",
            "Periodic high-pressure moments",
            "Consistently fast-paced",
            "High pressure with tight timelines",
        ],
    },
    {
        "id": "E6",
        "text": "Error Impact\nIf a mistake occurs, what is the typical impact?",
        "choices": [
            "Minimal, easily corrected",
            "Noticeable but manageable",
            "Costly or disruptive",
            "Severe consequences (safety, legal, financial)",
        ],
    },
    {
        "id": "E7",
        "text": "Feedback Style\nHow is performance feedback typically delivered in this role?",
        "choices": [
            "Infrequent and informal",
            "Regular but structured",
            "Frequent and direct",
            "Continuous, real-time feedback",
        ],
    },
    {
        "id": "E8",
        "text": "Team Dependence\nHow dependent is success in this role on coordination with others?",
        "choices": [
            "Mostly independent",
            "Some coordination required",
            "Strong reliance on team workflows",
            "Highly interdependent",
        ],
    },
    {
        "id": "E9",
        "text": "Learning Curve\nHow quickly is someone expected to become effective in this role?",
        "choices": [
            "Gradual, extended onboarding",
            "Moderate learning period",
            "Short ramp-up expected",
            "Immediate effectiveness required",
        ],
    },
    {
        "id": "E10",
        "text": "Role Risk Profile\nOverall, how would you characterize the risk level of this role?",
        "choices": [
            "Low risk, limited downstream impact",
            "Moderate risk",
            "High risk affecting others or outcomes",
            "Very high risk requiring strong judgment",
        ],
    },
    {
        "id": "E11",
        "text": "Task Variety\nHow varied are the tasks in this role?",
        "choices": [
            "Highly repetitive, same tasks daily",
            "Some variation with predictable patterns",
            "Many varied tasks requiring adaptation",
            "Constantly changing, diverse responsibilities",
        ],
    },
    {
        "id": "E12",
        "text": "Decision Complexity\nHow complex are the decisions required in this role?",
        "choices": [
            "Simple, routine decisions",
            "Moderate complexity, occasionally challenging",
            "Complex decisions affecting outcomes",
            "Highly complex, strategic decisions with significant consequences",
        ],
    },
    {
        "id": "E13",
        "text": "Communication Style\nHow formal or structured is communication in this role?",
        "choices": [
            "Very formal, following strict protocols",
            "Mostly formal with occasional flexibility",
            "Semi-formal, adaptable depending on context",
            "Informal, highly flexible, and situational",
        ],
    },
    {
        "id": "E14",
        "text": "Supervision Level\nHow closely is performance monitored?",
        "choices": [
            "Direct and frequent supervision",
            "Moderate oversight, regular check-ins",
            "Occasional supervision, autonomy encouraged",
            "Minimal supervision, self-directed",
        ],
    },
    {
        "id": "E15",
        "text": "Problem-Solving Approach\nWhat type of problem-solving is most common in this role?",
        "choices": [
            "Clear procedures to follow",
            "Some discretion with guidance",
            "Requires independent analysis and judgment",
            "High-level strategic problem-solving",
        ],
    },
    {
        "id": "E16",
        "text": "Collaboration Requirement\nHow much collaboration is essential for success?",
        "choices": [
            "Rarely collaborate",
            "Collaborate occasionally",
            "Frequent collaboration",
            "Constant collaboration across multiple stakeholders",
        ],
    },
    {
        "id": "E17",
        "text": "Innovation Expectation\nHow much innovation or creativity is expected in this role?",
        "choices": [
            "Very little, mostly routine tasks",
            "Some creative input encouraged",
            "Significant creative problem-solving expected",
            "Continuous innovation is critical",
        ],
    },
    {
        "id": "E18",
        "text": "Workload Predictability\nHow predictable is the workload?",
        "choices": [
            "Very predictable, structured schedule",
            "Mostly predictable with occasional fluctuations",
            "Often unpredictable, requires adaptation",
            "Constantly unpredictable, dynamic workload",
        ],
    },
    {
        "id": "E19",
        "text": "Leadership Exposure\nHow often does this role require influencing or leading others?",
        "choices": [
            "Rarely, individual contributor",
            "Occasionally, minor influence",
            "Frequently, leads small teams/projects",
            "Constantly, significant leadership responsibility",
        ],
    },
    {
        "id": "E20",
        "text": "Performance Measurement\nHow is success primarily measured in this role?",
        "choices": [
            "Task completion, clear metrics",
            "Combination of metrics and qualitative feedback",
            "Results-oriented, often measured by outcomes",
            "Strategic impact, broad organizational influence",
        ],
    },
]

def get_employer_epq_questions() -> Dict[str, List[dict]]:
    # Keep response format consistent with other endpoints that return { items: [...] }
    return {"items": QUESTIONS}
