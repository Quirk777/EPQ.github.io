# app/routes/bias.py
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.bias_detection import detect_bias, get_bias_score, suggest_alternative

router = APIRouter(prefix="/bias", tags=["bias"])

class BiasCheckRequest(BaseModel):
    text: str

@router.post("/check")
def check_bias(request: BiasCheckRequest):
    """
    Check text for potential bias and return detailed feedback.
    """
    result = detect_bias(request.text)
    score = get_bias_score(request.text)
    
    response = {
        "text": request.text,
        "bias_score": score,
        "has_bias": result is not None
    }
    
    if result:
        response["category"] = result["category"]
        response["warning"] = result["warning"]
        response["education"] = result["education"]
        response["matched_terms"] = result.get("matched_terms", [])
        response["alternative"] = suggest_alternative(request.text, result["category"])
        
        if "additional_concerns" in result:
            response["additional_concerns"] = result["additional_concerns"]
    
    return response
