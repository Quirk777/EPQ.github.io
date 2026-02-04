from typing import Dict

def score_epq(responses: Dict[str, int]) -> Dict:
    total = sum(int(v) for v in responses.values())
    if total <= 20:
        band = "Core"
    elif total <= 40:
        band = "Standard"
    else:
        band = "Advanced"
    return {
        "responses": responses,
        "total_score": total,
        "band": band
    }
