#!/usr/bin/env python3
"""
EPQ CLI - Employer 20-question flow.
Returns a dict with `total_score`, `average_score`, and `band`.
"""

import random
import datetime
import csv
import json
from collections import defaultdict
import questionary
import os

RNG_SEED = None
OUTPUT_CSV = "epq_responses.csv"

QUESTIONS = [
    ("1. Role Structure\nHow clearly defined are expectations, processes, and success criteria for this role?",
     ["Very clearly defined, little interpretation needed",
      "Mostly defined with some flexibility",
      "Broad goals, methods vary",
      "Largely undefined, requires self-direction"]),
    ("2. Change Frequency\nHow often do priorities, tools, or expectations shift for this role?",
     ["Rarely", "Occasionally", "Frequently", "Constantly"]),
    ("3. Autonomy Level\nHow much independence does this role have in making day-to-day decisions?",
     ["Very little, decisions are directed",
      "Some independence within guidelines",
      "High independence with accountability",
      "Nearly full autonomy"]),
    ("4. Interpersonal Exposure\nHow much interaction with coworkers, clients, or customers is required?",
     ["Minimal interaction",
      "Regular internal interaction",
      "Frequent collaboration or customer contact",
      "Constant interaction or relationship management"]),
    ("5. Pace & Pressure\nHow would you describe the typical pace and performance pressure of this role?",
     ["Steady and predictable",
      "Periodic high-pressure moments",
      "Consistently fast-paced",
      "High pressure with tight timelines"]),
    ("6. Error Impact\nIf a mistake occurs, what is the typical impact?",
     ["Minimal, easily corrected",
      "Noticeable but manageable",
      "Costly or disruptive",
      "Severe consequences (safety, legal, financial)"]),
    ("7. Feedback Style\nHow is performance feedback typically delivered in this role?",
     ["Infrequent and informal",
      "Regular but structured",
      "Frequent and direct",
      "Continuous, real-time feedback"]),
    ("8. Team Dependence\nHow dependent is success in this role on coordination with others?",
     ["Mostly independent",
      "Some coordination required",
      "Strong reliance on team workflows",
      "Highly interdependent"]),
    ("9. Learning Curve\nHow quickly is someone expected to become effective in this role?",
     ["Gradual, extended onboarding",
      "Moderate learning period",
      "Short ramp-up expected",
      "Immediate effectiveness required"]),
    ("10. Role Risk Profile\nOverall, how would you characterize the risk level of this role?",
     ["Low risk, limited downstream impact",
      "Moderate risk",
      "High risk affecting others or outcomes",
      "Very high risk requiring strong judgment"]),
    ("11. Task Variety\nHow varied are the tasks in this role?",
     ["Highly repetitive, same tasks daily",
      "Some variation with predictable patterns",
      "Many varied tasks requiring adaptation",
      "Constantly changing, diverse responsibilities"]),
    ("12. Decision Complexity\nHow complex are the decisions required in this role?",
     ["Simple, routine decisions",
      "Moderate complexity, occasionally challenging",
      "Complex decisions affecting outcomes",
      "Highly complex, strategic decisions with significant consequences"]),
    ("13. Communication Style\nHow formal or structured is communication in this role?",
     ["Very formal, following strict protocols",
      "Mostly formal with occasional flexibility",
      "Semi-formal, adaptable depending on context",
      "Informal, highly flexible, and situational"]),
    ("14. Supervision Level\nHow closely is performance monitored?",
     ["Direct and frequent supervision",
      "Moderate oversight, regular check-ins",
      "Occasional supervision, autonomy encouraged",
      "Minimal supervision, self-directed"]),
    ("15. Problem-Solving Approach\nWhat type of problem-solving is most common in this role?",
     ["Clear procedures to follow",
      "Some discretion with guidance",
      "Requires independent analysis and judgment",
      "High-level strategic problem-solving"]),
    ("16. Collaboration Requirement\nHow much collaboration is essential for success?",
     ["Rarely collaborate",
      "Collaborate occasionally",
      "Frequent collaboration",
      "Constant collaboration across multiple stakeholders"]),
    ("17. Innovation Expectation\nHow much innovation or creativity is expected in this role?",
     ["Very little, mostly routine tasks",
      "Some creative input encouraged",
      "Significant creative problem-solving expected",
      "Continuous innovation is critical"]),
    ("18. Workload Predictability\nHow predictable is the workload?",
     ["Very predictable, structured schedule",
      "Mostly predictable with occasional fluctuations",
      "Often unpredictable, requires adaptation",
      "Constantly unpredictable, dynamic workload"]),
    ("19. Leadership Exposure\nHow often does this role require influencing or leading others?",
     ["Rarely, individual contributor",
      "Occasionally, minor influence",
      "Frequently, leads small teams/projects",
      "Constantly, significant leadership responsibility"]),
    ("20. Performance Measurement\nHow is success primarily measured in this role?",
     ["Task completion, clear metrics",
      "Combination of metrics and qualitative feedback",
      "Results-oriented, often measured by outcomes",
      "Strategic impact, broad organizational influence"])
]

SCORE_VALUES = [1,2,3,4]

def epq_band(avg_score: float):
    if avg_score <= 2.0:
        return "Core Preference (≤ 2.0) — prefers lower environmental load"
    elif avg_score < 3.0:
        return "Standard Preference (2.1–2.9) — flexible across environments"
    else:
        return "Advanced Preference (≥ 3.0) — prefers higher environmental load"

def shuffle_choices_with_scores(choices, seed=None, construct="SCL"):
    paired = [(text, SCORE_VALUES[idx]) for idx, text in enumerate(choices)]
    if seed is not None:
        random.seed(seed)
    random.shuffle(paired)
    labels = ['A','B','C','D']
    return [{"label": labels[i], "text": paired[i][0], "score": paired[i][1], "construct": construct} for i in range(len(paired))]

def prompt_user_for_choice(choices, return_scores=False):
    q_choices = [ questionary.Choice(title=f"{c['label']}. {c['text']}", value=c) for c in choices ]
    selected = questionary.select("Select an option (use ↑ ↓ and press Enter):", choices=q_choices, use_indicator=True).ask()
    if selected is None:
        raise RuntimeError("Selection cancelled or terminal doesn't support interactive prompts.")
    score = selected["score"]
    if return_scores:
        return score, selected["label"], selected["text"], {selected["construct"]: score}
    return score, selected["label"], selected["text"]

def save_response_csv(filename, row_dict):
    file_exists = os.path.isfile(filename)
    with open(filename, mode='a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=list(row_dict.keys()))
        if not file_exists:
            writer.writeheader()
        writer.writerow(row_dict)

def run_epq_cli():
    if RNG_SEED is not None:
        random.seed(RNG_SEED)

    print("\nEnvironment Preference Questionnaire (EPQ) — Employer (CLI)\n")
    responses = []
    total_score = 0
    construct_totals = defaultdict(int)
    construct_counts = defaultdict(int)

    for idx, (prompt, choices) in enumerate(QUESTIONS, start=1):
        print(f"\nQ{idx}. {prompt}")
        seed = (RNG_SEED + idx) if RNG_SEED is not None else None
        shuffled = shuffle_choices_with_scores(choices, seed=seed, construct="SCL")
        score, label, text, selected_scores = prompt_user_for_choice(shuffled, return_scores=True)
        responses.append({
            "question_index": idx,
            "prompt": prompt,
            "chosen_label": label,
            "chosen_text": text,
            "score": score,
            "construct_scores": selected_scores
        })
        total_score += score
        for c, val in selected_scores.items():
            construct_totals[c] += val
            construct_counts[c] += 1

    avg_score = total_score / len(QUESTIONS)
    band = epq_band(avg_score)
    construct_scores = {c: construct_totals[c]/construct_counts[c] for c in construct_totals}

    # Save CSV (best-effort)
    if OUTPUT_CSV:
        row = {
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "total_score": total_score,
            "avg_score": f"{avg_score:.2f}",
            "band": band,
            "responses": " | ".join([f"Q{r['question_index']}:{r['chosen_label']}:{r['score']}" for r in responses]),
            "construct_scores": json.dumps(construct_scores)
        }
        try:
            save_response_csv(OUTPUT_CSV, row)
        except Exception:
            pass

    return {
        "total_score": total_score,
        "average_score": avg_score,
        "band": band,
        "responses": responses,
        "construct_scores": construct_scores
    }

if __name__ == "__main__":
    run_epq_cli()
