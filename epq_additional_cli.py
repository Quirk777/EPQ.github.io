#!/usr/bin/env python3
"""
EPQ Additional Engine
- Implements the extra questions (SCL/CCD/CIL/CVL/ERL/MSD/ICI/AJL)
- Randomizes answer order while preserving per-option construct scores
- Captures latency, computes per-construct averages, consistency, and saves JSON/CSV
"""

import random
import time
import json
import csv
import datetime
import os
import questionary
from collections import defaultdict
from statistics import median, stdev

RNG_SEED = None
OUTPUT_JSON_DIR = "."
OUTPUT_SUMMARY_CSV = "epq_additional_summary.csv"

# QUESTIONS list (id, text, options with per-option 'scores' dict)
QUESTIONS = [
    {"id": 1, "text": "Which would frustrate you more over time?",
     "options": [
         {"text": "Clear expectations with little flexibility",
          "scores": {"SCL": 3, "AJL": 1}},
         {"text": "Flexible expectations with unclear boundaries",
          "scores": {"SCL": 2, "CVL": 3}}
     ]},
    {"id": 2, "text": "When starting a new task, you usually prefer to:",
     "options": [
         {"text": "Understand the full process before beginning",
          "scores": {"SCL": 3, "CCD": 1}},
         {"text": "Start and adjust as you go",
          "scores": {"SCL": 2, "CCD": 3}}
     ]},
    {"id": 3, "text": "Which environment feels more comfortable?",
     "options": [
         {"text": "Clear rules and procedures",
          "scores": {"SCL": 3, "MSD": 1}},
         {"text": "Rules evolve based on situations",
          "scores": {"SCL": 2, "CVL": 3}}
     ]},
    {"id": 4, "text": "You receive vague instructions for a task. What do you do first?",
     "options": [
         {"text": "Ask clarifying questions",
          "scores": {"SCL": 3, "AJL": 1}},
         {"text": "Make an initial decision and proceed",
          "scores": {"SCL": 2, "AJL": 3}}
     ]},
    {"id": 5, "text": "Which statement feels closer to you?",
     "options": [
         {"text": "I like knowing exactly what success looks like",
          "scores": {"SCL": 3, "MSD": 1}},
         {"text": "I like defining success as you work",
          "scores": {"SCL": 2, "MSD": 3}}
     ]},
    # CCD block
    {"id": 6, "text": "When faced with a tight deadline and limited information, you are more likely to:",
     "options": [
         {"text": "Decide quickly and refine later",
          "scores": {"CCD": 3, "AJL": 2}},
         {"text": "Slow down to reduce uncertainty",
          "scores": {"CCD": 2, "ERL": 2}}
     ]},
    {"id": 7, "text": "You’re solving a problem others find confusing. Your instinct is to:",
     "options": [
         {"text": "Break it down step by step",
          "scores": {"CCD": 2, "CIL": 2}},
         {"text": "Look for a pattern or shortcut",
          "scores": {"CCD": 3, "AJL": 2}}
     ]},
    {"id": 8, "text": "Which feels more natural?",
     "options": [
         {"text": "Making decisions based on careful analysis",
          "scores": {"CCD": 2, "CIL": 3}},
         {"text": "Making decisions based on experience and intuition",
          "scores": {"CCD": 3, "AJL": 2}}
     ]},
    {"id": 9, "text": "If new information contradicts your original plan, you tend to:",
     "options": [
         {"text": "Adjust quickly",
          "scores": {"CIL": 2, "CVL": 3}},
         {"text": "Reevaluate entire approach",
          "scores": {"CIL": 3, "CCD": 2}}
     ]},
    {"id": 10, "text": "Which situation is more mentally draining?",
     "options": [
         {"text": "Too many options",
          "scores": {"CCD": 3, "CVL": 2}},
         {"text": "Too few options",
          "scores": {"CCD": 2, "MSD": 2}}
     ]},
    {"id": 11, "text": "When plans change unexpectedly, your first internal reaction is usually:",
     "options": [
         {"text": "Brief frustration, then focus",
          "scores": {"CVL": 2, "ERL": 3}},
         {"text": "Immediate problem-solving",
          "scores": {"CVL": 3, "AJL": 2}},
         {"text": "Lingering stress",
          "scores": {"CVL": 3, "ERL": 3}}
     ]},
    {"id": 12, "text": "Under pressure, you tend to become:",
     "options": [
         {"text": "More focused",
          "scores": {"ERL": 2, "CVL": 2}},
         {"text": "More cautious",
          "scores": {"ERL": 2, "AJL": 2}},
         {"text": "More reactive",
          "scores": {"ERL": 3, "CVL": 3}}
     ]},
    {"id": 13, "text": "After a stressful workday, you typically:",
     "options": [
         {"text": "Recover quickly",
          "scores": {"ERL": 2, "MSD": 2}},
         {"text": "Need time alone",
          "scores": {"ERL": 3, "ICI": 2}},
         {"text": "Continue thinking",
          "scores": {"ERL": 3, "CCD": 2}}
     ]},
    {"id": 14, "text": "When something goes wrong that you didn’t cause, you usually:",
     "options": [
         {"text": "Accept it and move forward",
          "scores": {"ERL": 2, "CVL": 2}},
         {"text": "Feel irritated but adjust",
          "scores": {"ERL": 3, "CVL": 2}},
         {"text": "Feel unsettled until it’s resolved",
          "scores": {"ERL": 3, "CVL": 3}}
     ]},
    {"id": 15, "text": "Which statement fits better?",
     "options": [
         {"text": "Stress sharpens my performance",
          "scores": {"ERL": 2, "MSD": 3}},
         {"text": "Stress slows my performance",
          "scores": {"ERL": 3, "CVL": 2}}
     ]},
    # MSD block
    {"id": 16, "text": "Rank what motivates you most at work (pick the top choice):",
     "options": [
         {"text": "Freedom in how I work",
          "scores": {"MSD": 3, "AJL": 3}},
         {"text": "Improving my skills",
          "scores": {"MSD": 2, "CIL": 2}},
         {"text": "Being recognized for results",
          "scores": {"MSD": 1, "ICI": 2}}
     ]},
    {"id": 17, "text": "Which would feel more draining long-term?",
     "options": [
         {"text": "Repetitive tasks",
          "scores": {"MSD": 1, "CVL": 1}},
         {"text": "Unclear expectations",
          "scores": {"MSD": 2, "SCL": 2}},
         {"text": "Constant evaluation",
          "scores": {"MSD": 3, "ERL": 3}}
     ]},
    {"id": 18, "text": "You feel most satisfied at work when:",
     "options": [
         {"text": "You’ve mastered something difficult",
          "scores": {"MSD": 3, "CIL": 3}},
         {"text": "You’ve completed tasks efficiently",
          "scores": {"MSD": 1, "CCD": 2}},
         {"text": "Others notice your contribution",
          "scores": {"MSD": 2, "ICI": 2}}
     ]},
    {"id": 19, "text": "Which role sounds more appealing?",
     "options": [
         {"text": "One with independence and responsibility",
          "scores": {"SCL": 3, "AJL": 3}},
         {"text": "One with guidance and support",
          "scores": {"SCL": 2, "MSD": 2}}
     ]},
    {"id": 20, "text": "When starting a new role, what matters most early on?",
     "options": [
         {"text": "Feeling competent",
          "scores": {"MSD": 1, "CCD": 2}},
         {"text": "Feeling trusted",
          "scores": {"MSD": 3, "AJL": 3}},
         {"text": "Feeling acknowledged",
          "scores": {"MSD": 2, "ICI": 2}}
     ]},
    # ICI block
    {"id": 21, "text": "During a disagreement at work, you usually:",
     "options": [
         {"text": "Defend your position clearly",
          "scores": {"ICI": 3, "AJL": 2}},
         {"text": "Ask questions to understand",
          "scores": {"ICI": 2, "CIL": 2}},
         {"text": "Step back and revisit later",
          "scores": {"ICI": 1, "ERL": 2}}
     ]},
    {"id": 22, "text": "If a teammate is struggling, you are more likely to:",
     "options": [
         {"text": "Offer help directly",
          "scores": {"ICI": 3, "MSD": 2}},
         {"text": "Give them space",
          "scores": {"ICI": 1, "ERL": 2}},
         {"text": "Inform a supervisor",
          "scores": {"ICI": 2, "AJL": 2}}
     ]},
    {"id": 23, "text": "Which feels more uncomfortable?",
     "options": [
         {"text": "Giving direct feedback",
          "scores": {"ICI": 3, "ERL": 2}},
         {"text": "Receiving direct feedback",
          "scores": {"ICI": 1, "ERL": 2}}
     ]},
    {"id": 24, "text": "In group settings, you tend to:",
     "options": [
         {"text": "Speak up early",
          "scores": {"ICI": 3, "AJL": 2}},
         {"text": "Listen first, then contribute",
          "scores": {"ICI": 2, "CIL": 2}},
         {"text": "Speak only when needed",
          "scores": {"ICI": 1, "ERL": 2}}
     ]},
    {"id": 25, "text": "When working with others, what matters most to you?",
     "options": [
         {"text": "Clear roles",
          "scores": {"ICI": 1, "SCL": 3}},
         {"text": "Mutual respect",
          "scores": {"ICI": 2, "ERL": 2}},
         {"text": "Efficient outcomes",
          "scores": {"ICI": 3, "CCD": 3}}
     ]},
    {"id": 26, "text": "When expectations are unclear, which approach feels more natural?",
     "options": [
         {"text": "Creating your own structure", "scores": {"SCL": 3, "AJL": 2}},
         {"text": "Waiting until direction is clarified", "scores": {"SCL": 2, "AJL": 1}}
     ]},
    {"id": 27, "text": "When faced with a complex problem, you prefer to:",
     "options": [
         {"text": "Simplify it as quickly as possible", "scores": {"CCD": 3, "CIL": 2}},
         {"text": "Fully understand all variables first", "scores": {"CCD": 2, "CIL": 3}}
     ]},
    {"id": 28, "text": "If you’re unsure about a decision, you’re more likely to:",
     "options": [
         {"text": "Trust your judgment", "scores": {"CCD": 3, "AJL": 2}},
         {"text": "Seek additional input", "scores": {"CCD": 2, "ICI": 2}}
     ]},
    {"id": 29, "text": "Under sustained pressure, you usually:",
     "options": [
         {"text": "Maintain steady performance", "scores": {"CVL": 2, "ERL": 3}},
         {"text": "Perform well, then fatigue", "scores": {"CVL": 3, "ERL": 2}},
         {"text": "Struggle to maintain focus", "scores": {"CVL": 3, "ERL": 3}}
     ]},
    {"id": 30, "text": "You’re more motivated by:",
     "options": [
         {"text": "Challenging work", "scores": {"MSD": 3, "CIL": 3}},
         {"text": "Predictable success", "scores": {"MSD": 1, "ERL": 2}}
     ]},
    {"id": 31, "text": "In discussions, you usually focus on:",
     "options": [
         {"text": "Getting your point across", "scores": {"ICI": 3, "AJL": 2}},
         {"text": "Reaching shared understanding", "scores": {"ICI": 1, "CIL": 2}}
     ]},
    {"id": 32, "text": "When evaluating multiple solutions, you prefer:",
     "options": [
         {"text": "The most efficient solution", "scores": {"CCD": 3, "MSD": 2}},
         {"text": "The most thorough solution", "scores": {"CCD": 2, "MSD": 3}}
     ]},
    {"id": 33, "text": "You’re given a goal with competing priorities. What do you do first?",
     "options": [
         {"text": "Clarify priorities before acting", "scores": {"SCL": 3, "CCD": 2}},
         {"text": "Start with the most urgent item", "scores": {"SCL": 2, "CCD": 3}}
     ]},
    {"id": 34, "text": "When guidelines conflict, you tend to:",
     "options": [
         {"text": "Follow the most recent guidance", "scores": {"SCL": 3, "AJL": 1}},
         {"text": "Use judgment to reconcile", "scores": {"SCL": 2, "AJL": 3}}
     ]},
    {"id": 35, "text": "When a solution works but feels inelegant, you prefer to:",
     "options": [
         {"text": "Improve it", "scores": {"CCD": 2, "MSD": 3}},
         {"text": "Keep it if it works", "scores": {"CCD": 3, "MSD": 2}}
     ]},
    {"id": 36, "text": "Faced with a novel problem, you rely more on:",
     "options": [
         {"text": "Prior examples", "scores": {"CCD": 2, "CIL": 2}},
         {"text": "First-principles reasoning", "scores": {"CCD": 3, "CIL": 3}}
     ]},
    {"id": 37, "text": "During prolonged uncertainty, your stress level typically:",
     "options": [
         {"text": "Stabilizes", "scores": {"CVL": 2, "ERL": 3}},
         {"text": "Gradually increases", "scores": {"CVL": 3, "ERL": 2}}
     ]},
    {"id": 38, "text": "When outcomes are out of your control, you focus on:",
     "options": [
         {"text": "Influencing what you can", "scores": {"CVL": 3, "AJL": 2}},
         {"text": "Waiting for clarity", "scores": {"CVL": 2, "ERL": 2}}
     ]},
    {"id": 39, "text": "You’re more energized by roles that offer:",
     "options": [
         {"text": "Impact and ownership", "scores": {"MSD": 3, "AJL": 3}},
         {"text": "Clear expectations and continuity", "scores": {"MSD": 1, "SCL": 3}}
     ]},
    {"id": 40, "text": "If progress is slow but meaningful, you feel:",
     "options": [
         {"text": "Patient and committed", "scores": {"MSD": 1, "ERL": 2}},
         {"text": "Restless and disengaged", "scores": {"MSD": 3, "CVL": 3}}
     ]},
    {"id": 41, "text": "When alignment is missing across teams, you tend to:",
     "options": [
         {"text": "Push for alignment", "scores": {"ICI": 3, "AJL": 3}},
         {"text": "Adjust locally", "scores": {"ICI": 1, "CVL": 2}}
     ]},
    {"id": 42, "text": "In high-stakes discussions, you value more:",
     "options": [
         {"text": "Precision", "scores": {"ICI": 1, "CCD": 3}},
         {"text": "Rapport", "scores": {"ICI": 3, "ERL": 2}}
     ]},
    {"id": 43, "text": "A key assumption proves wrong late in a project. What’s your first move?",
     "options": [
         {"text": "Adjust and continue", "scores": {"CIL": 2, "AJL": 3}},
         {"text": "Reassess the plan", "scores": {"CIL": 3, "CCD": 2}},
         {"text": "Escalate for input", "scores": {"CIL": 3, "ICI": 3}}
     ]},
    {"id": 44, "text": "After you communicate the change, a stakeholder reacts negatively. You:",
     "options": [
         {"text": "Clarify reasoning", "scores": {"CIL": 2, "ICI": 3}},
         {"text": "Listen and adapt", "scores": {"CIL": 3, "ERL": 2}},
         {"text": "Pause and regroup", "scores": {"CIL": 3, "CVL": 2}}
     ]},
    {"id": 45, "text": "With time short, you prioritize:",
     "options": [
         {"text": "Delivery", "scores": {"CCD": 3, "MSD": 2}},
         {"text": "Accuracy", "scores": {"CCD": 2, "CIL": 3}}
     ]},
    {"id": 46, "text": "I’m comfortable acting without full clarity.",
     "options": [
         {"text": "Agree", "scores": {"AJL": 3, "CCD": 2}},
         {"text": "Disagree", "scores": {"AJL": 1, "ERL": 2}}
     ]},
    {"id": 47, "text": "I prefer clear direction before proceeding.",
     "options": [
         {"text": "Agree", "scores": {"AJL": 1, "SCL": 3}},
         {"text": "Disagree", "scores": {"AJL": 3, "CVL": 2}}
     ]},
    {"id": 48, "text": "When a team misses a target, you first:",
     "options": [
         {"text": "Review the system", "scores": {"AJL": 3, "CIL": 3}},
         {"text": "Review individual actions", "scores": {"AJL": 1, "ICI": 2}}
     ]},
    {"id": 49, "text": "When delegating, you focus on:",
     "options": [
         {"text": "Outcomes", "scores": {"AJL": 3, "MSD": 2}},
         {"text": "Methods", "scores": {"AJL": 1, "SCL": 3}}
     ]},
    {"id": 50, "text": "When authority and expertise conflict, you defer to:",
     "options": [
         {"text": "Expertise", "scores": {"AJL": 3, "CIL": 3}},
         {"text": "Authority", "scores": {"AJL": 1, "SCL": 3}}
     ]},
]
LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

def shuffle_options_with_labels(options):
    opts = options[:]  # shallow copy
    if RNG_SEED is not None:
        random.seed(RNG_SEED + (hash(options[0]["text"]) % 1000))
    random.shuffle(opts)
    labeled = []
    for i, opt in enumerate(opts):
        label = LABELS[i]
        labeled.append((label, opt))
    return labeled

def run(max_question_id: int = 50):
    if RNG_SEED is not None:
        random.seed(RNG_SEED)

    print("\nEPQ — Additional Items (SCL/CCD/CIL/CVL/ERL/MSD/ICI/AJL)\n")
    print(f"Assessment scope: Questions 1–{max_question_id}")

    full_responses = []
    construct_totals = defaultdict(int)
    construct_counts = defaultdict(int)

    filtered_questions = sorted(
        (q for q in QUESTIONS if q["id"] <= max_question_id),
        key=lambda q: q["id"]
    )

    latencies = []

    for q in filtered_questions:
        qid = q["id"]
        print(f"\nQ{qid}. {q['text']}")
        labeled_opts = shuffle_options_with_labels(q["options"])
        for label, opt in labeled_opts:
            print(f"  {label}. {opt['text']}")

        start = time.time()
        option_texts = [opt["text"] for _, opt in labeled_opts]
        selected_text = questionary.select("Select the option:", choices=option_texts).ask()
        end = time.time()
        latency = end - start
        latencies.append(latency)

        selected_opt = next(opt for label, opt in labeled_opts if opt["text"] == selected_text)
        choice = next(label for label, opt in labeled_opts if opt["text"] == selected_text)

        selected_scores = selected_opt.get("scores", {})
        for construct, val in selected_scores.items():
            construct_totals[construct] += val
            construct_counts[construct] += 1

        mapping = {label: opt["text"] for label, opt in labeled_opts}
        mapping_scores = {label: opt.get("scores", {}) for label, opt in labeled_opts}
        full_responses.append({
            "id": qid,
            "text": q["text"],
            "chosen_label": choice,
            "chosen_text": selected_opt["text"],
            "chosen_scores": selected_scores,
            "option_label_map": mapping,
            "option_label_scores": mapping_scores,
            "latency_seconds": round(latency, 3),
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
        })

    constructs = sorted(set(list(construct_totals.keys()) + list(construct_counts.keys())))
    aggregates = {}
    for c in constructs:
        total = construct_totals.get(c, 0)
        count = construct_counts.get(c, 0)
        avg = (total / count) if count > 0 else None
        aggregates[c] = {"total": total, "count": count, "average": round(avg, 3) if avg is not None else None}

    median_latency = median(latencies) if latencies else 0
    latency_flags = []
    for resp in full_responses:
        lat = resp["latency_seconds"]
        flag = None
        if median_latency > 0:
            if lat < 0.4 * median_latency:
                flag = "very_fast"
            elif lat > 2.5 * median_latency:
                flag = "very_slow"
        latency_flags.append({"id": resp["id"], "latency": lat, "flag": flag})

    per_construct_items = defaultdict(list)
    for resp in full_responses:
        for construct, val in resp["chosen_scores"].items():
            per_construct_items[construct].append(val)

    consistency = {}
    for c, vals in per_construct_items.items():
        if len(vals) >= 2:
            try:
                s = stdev(vals)
            except:
                s = 0.0
            consistency_score = round(max(0.0, 1.0 - (s / 1.0)), 3)
        else:
            consistency_score = None
        consistency[c] = consistency_score

    result = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "responses": full_responses,
        "aggregates": aggregates,
        "latency_summary": {
            "median_latency_sec": round(median_latency, 3),
            "latency_flags": latency_flags
        },
        "consistency": consistency
    }

    filename = os.path.join(OUTPUT_JSON_DIR, f"epq_additional_result_{datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.json")
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"\nFull results saved to {filename}")

    csv_row = {
        "timestamp": result["timestamp"],
        "construct_averages": json.dumps({k: v["average"] for k, v in aggregates.items()}),
        "median_latency_sec": round(median_latency, 3)
    }
    write_header = not os.path.exists(OUTPUT_SUMMARY_CSV)
    with open(OUTPUT_SUMMARY_CSV, "a", newline="", encoding="utf-8") as cf:
        writer = csv.DictWriter(cf, fieldnames=list(csv_row.keys()))
        if write_header:
            writer.writeheader()
        writer.writerow(csv_row)
    print(f"Summary appended to {OUTPUT_SUMMARY_CSV}")

    print("\n--- Construct Averages ---")
    for c, v in sorted(aggregates.items()):
        print(f"{c}: avg={v['average']} (count={v['count']}, total={v['total']})")
    print(f"\nMedian response time: {round(median_latency,3)} sec")

    print("\nConsistency (0-1, higher is more consistent):")
    for c, sc in sorted(consistency.items()):
        print(f"{c}: {sc}")

    result["construct_scores"] = {k: v["average"] for k, v in aggregates.items()}

    print("\nDone.")
    return result

if __name__ == "__main__":
    run()

