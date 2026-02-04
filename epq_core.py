# epq_core.py
"""
Pure, import-safe EPQ core logic.
No terminal input. Suitable for web (FastAPI) and CLI callers.
"""

from typing import Dict, List, Tuple, Any

def score_epq(responses: Dict[str, int]) -> Dict[str, Any]:
    """
    Return dict: {
      "responses": responses,
      "aggregates": { construct_key: {"average": float, ...}, ... },
      "total_score": int,
      "overall_band": "High"|"Moderate"|"Low"
    }
    Attempts to use app.services.scoring.score_epq if available.
    """
    try:
        from app.services.scoring import score_epq as external_score
        return external_score(responses)
    except Exception:
        pass

    # Fallback grouping: every 5 questions -> one construct
    aggregates = {}
    items = sorted(responses.items(), key=lambda kv: kv[0])
    for idx, (qid, val) in enumerate(items):
        construct_key = f"construct_{(idx // 5) + 1}"
        aggregates.setdefault(construct_key, []).append(int(val))
    agg_out = {}
    for k, vals in aggregates.items():
        avg = sum(vals) / len(vals) if vals else 0.0
        agg_out[k] = {"average": avg}
    total = sum(int(v) for v in responses.values()) if responses else 0
    avg_all = total / max(len(responses), 1)
    if avg_all >= 3.0:
        overall_band = "High"
    elif avg_all >= 2.0:
        overall_band = "Moderate"
    else:
        overall_band = "Low"
    return {"responses": responses, "aggregates": agg_out, "total_score": total, "overall_band": overall_band}

def environment_and_max_questions_from_employer_answers(answers: Dict[str, int]) -> Tuple[str, int]:
    """
    Map employer 20-question answers -> (environment, max_questions)
    """
    vals = [int(v) for v in answers.values() if isinstance(v, (int, float)) or (str(v).isdigit())]
    if not vals:
        return ("moderate", 32)
    avg = sum(vals) / len(vals)
    if avg >= 3.0:
        return ("high", 50)
    elif avg >= 2.0:
        return ("moderate", 32)
    else:
        return ("low", 25)

def generate_questions(max_q: int):
    from epq_additional_cli import QUESTIONS as ADDITIONAL

    out = []
    for q in ADDITIONAL:
        if len(out) >= int(max_q):
            break

        out.append({
            "id": f"Q{q['id']}",
            "prompt": q["text"],
            "choices": [opt["text"] for opt in q["options"]],  # <- no [:4]
        })

    return out

def run_applicant_from_choice_responses(responses: Dict[str, str]) -> Dict[str, Any]:
    """
    responses = { "Q1": "Clear expectations ...", ... }

    Output includes:
    - construct_scores: per-construct averages
    - overall_average: average of construct averages
    - overall_band: Low/Moderate/High
    """
    base: Dict[str, Any] = {"responses": responses}

    construct_scores: Dict[str, float] = {}
    try:
        from epq_questions import score_choice_responses_to_constructs

        max_q = max(
            [int(k[1:]) for k in responses.keys()
             if isinstance(k, str) and k.startswith("Q") and k[1:].isdigit()] + [50]
        )

        construct_scores = score_choice_responses_to_constructs(responses, max_q=max_q)
        base["construct_scores"] = construct_scores
    except Exception as exc:
        base["construct_scores"] = {}
        base["construct_scoring_error"] = str(exc)

    if construct_scores:
        vals = [float(v) for v in construct_scores.values() if isinstance(v, (int, float))]
        overall_avg = (sum(vals) / len(vals)) if vals else 0.0
    else:
        overall_avg = 0.0

    base["overall_average"] = round(overall_avg, 2)

    if overall_avg >= 3.0:
        base["overall_band"] = "High"
    elif overall_avg >= 2.0:
        base["overall_band"] = "Moderate"
    else:
        base["overall_band"] = "Low"

    return base
