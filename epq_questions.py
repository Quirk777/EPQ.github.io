# epq_questions.py
"""
EPQ Applicant Question Bank and scoring (web-safe).

- Preserves your real choice counts (2/3/4/etc). No padding to 4.
- Builds a mapping from (QID + chosen option text) -> construct score contributions.
- Scores submissions that send chosen option text.
"""

from typing import Dict, Any, List


def get_question_bank(max_q: int) -> List[Dict[str, Any]]:
    """
    Returns questions in the API/Frontend shape:
      { "id": "Q1", "prompt": "...", "choices": ["...", "...", ...] }

    IMPORTANT:
    - We do NOT pad to 4.
    - We preserve your real choice counts.
    """
    from epq_additional_cli import QUESTIONS

    max_q = int(max_q) if max_q else 50
    filtered = sorted(
        (q for q in QUESTIONS if int(q.get("id", 0)) <= max_q),
        key=lambda x: int(x.get("id", 0)),
    )

    out: List[Dict[str, Any]] = []
    for q in filtered:
        qnum = int(q.get("id", 0))
        qid = f"Q{qnum}"
        prompt = str(q.get("text", "")).strip()

        opts = q.get("options") or []
        choices: List[str] = []
        if isinstance(opts, list):
            for o in opts:
                if isinstance(o, dict):
                    t = str(o.get("text", "")).strip()
                    if t:
                        choices.append(t)

        if not prompt or len(choices) < 2:
            continue

        out.append({"id": qid, "prompt": prompt, "choices": choices})

    return out


def _normalize_choice_key(s: str) -> str:
    """
    Normalize choice text so comparisons survive extra spaces and common punctuation differences.
    """
    s = (s or "").strip()
    s = s.replace("\u2019", "'")  # smart apostrophe -> straight
    s = s.replace("\u201c", '"').replace("\u201d", '"')  # smart quotes -> straight
    s = s.replace("\u2013", "-").replace("\u2014", "-")  # dashes -> hyphen
    s = " ".join(s.lower().split())
    return s


def build_choice_score_lookup(max_q: int) -> Dict[str, Dict[str, Dict[str, int]]]:
    """
    Returns:
      {
        "Q1": {
          "<normalized choice text>": {"SCL":3,"AJL":1},
          "<normalized choice text>": {"SCL":2,"CVL":3}
        },
        ...
      }
    """
    from epq_additional_cli import QUESTIONS

    max_q = int(max_q) if max_q else 50
    filtered = sorted(
        (q for q in QUESTIONS if int(q.get("id", 0)) <= max_q),
        key=lambda x: int(x.get("id", 0)),
    )

    lookup: Dict[str, Dict[str, Dict[str, int]]] = {}

    for q in filtered:
        qnum = int(q.get("id", 0))
        qid = f"Q{qnum}"
        opts = q.get("options") or []

        per_q: Dict[str, Dict[str, int]] = {}

        if isinstance(opts, list):
            for o in opts:
                if not isinstance(o, dict):
                    continue

                text = str(o.get("text", "")).strip()
                if not text:
                    continue

                scores = o.get("scores") or {}
                if not isinstance(scores, dict):
                    scores = {}

                cleaned_scores: Dict[str, int] = {}
                for k, v in scores.items():
                    try:
                        cleaned_scores[str(k)] = int(v)
                    except Exception:
                        pass

                per_q[_normalize_choice_key(text)] = cleaned_scores

        lookup[qid] = per_q

    return lookup


def score_choice_responses_to_constructs(
    responses: Dict[str, str],
    max_q: int = 50,
) -> Dict[str, float]:
    """
    Convert {QID: chosen_text} into per-construct averages.
    Returns { "SCL": 2.6, "AJL": 1.9, ... }
    """
    lookup = build_choice_score_lookup(max_q)

    totals: Dict[str, int] = {}
    counts: Dict[str, int] = {}

    for qid, chosen in (responses or {}).items():
        if not isinstance(qid, str):
            continue

        qid = qid.strip()
        if qid not in lookup:
            continue

        chosen_key = _normalize_choice_key(str(chosen))
        contrib = lookup[qid].get(chosen_key)

        # If exact key doesn't match, try a soft match (contains) as last resort
        if contrib is None and chosen_key:
            for k, v in lookup[qid].items():
                if chosen_key in k or k in chosen_key:
                    contrib = v
                    break

        if contrib is None:
            continue

        for c, v in contrib.items():
            totals[c] = totals.get(c, 0) + int(v)
            counts[c] = counts.get(c, 0) + 1

    avgs: Dict[str, float] = {}
    for c, total in totals.items():
        avgs[c] = round(total / max(counts.get(c, 1), 1), 2)

    return avgs
