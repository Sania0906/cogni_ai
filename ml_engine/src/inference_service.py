"""
CognifyAI Machine Learning Engine - FastAPI Inference Service
Provides production REST API endpoints for ATS resume scoring,
career trajectory classification, candidate ranking, and skill extraction.
"""

import os
import sys
import io
import json
import hmac
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from .preprocessing import clean_text, extract_text_from_pdf, EmptyDocumentError, CorruptedPDFError
    from .skill_extractor import SkillExtractor
    from .ats_predictor import ATSPredictor
    from .career_predictor import CareerPredictor
except ImportError:
    sys.path.insert(0, os.path.dirname(__file__))
    from preprocessing import clean_text, extract_text_from_pdf, EmptyDocumentError, CorruptedPDFError
    from skill_extractor import SkillExtractor
    from ats_predictor import ATSPredictor
    from career_predictor import CareerPredictor

app = FastAPI(
    title="CognifyAI Machine Learning Engine",
    description="High-performance genuine ML engine for ATS scoring, career pathing, and candidate ranking.",
    version="1.0.0"
)

# Restrict CORS origins; ML engine sits behind Express gateway in production
_ml_cors_env = os.getenv("ML_CORS_ORIGINS", "").strip()
_ml_allowed_origins = (
    ["*"]
    if _ml_cors_env == "*"
    else (
        [o.strip() for o in _ml_cors_env.split(",") if o.strip()]
        if _ml_cors_env
        else ["http://127.0.0.1:5000", "http://localhost:5000"]
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ml_allowed_origins,
    allow_credentials=False if _ml_allowed_origins == ["*"] else True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-ML-Service-Secret"],
)


def verify_service_secret(
    x_ml_service_secret: Optional[str] = Header(default=None, alias="X-ML-Service-Secret")
):
    """
    Validates optional shared secret between Express backend and private FastAPI ML service.
    If ML_SERVICE_SECRET is configured, requests must supply an identical header value.
    """
    expected = os.getenv("ML_SERVICE_SECRET", "").strip()
    if not expected:
        return
    provided = (x_ml_service_secret or "").strip()
    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing ML service authentication credential.",
        )

# Initialize Predictors (Singletons)
ats_predictor: Optional[ATSPredictor] = None
career_predictor: Optional[CareerPredictor] = None
skill_extractor = SkillExtractor()


@app.on_event("startup")
def load_models():
    global ats_predictor, career_predictor
    try:
        ats_predictor = ATSPredictor()
        print("[InferenceService] ATS Predictor loaded successfully.")
    except Exception as e:
        print(f"[InferenceService] Warning: Failed to load ATS Predictor: {e}")

    try:
        career_predictor = CareerPredictor()
        print("[InferenceService] Career Predictor loaded successfully.")
    except Exception as e:
        print(f"[InferenceService] Warning: Failed to load Career Predictor: {e}")


# Pydantic Schemas
class ATSRequest(BaseModel):
    resume_text: str = Field(..., min_length=20, description="Full candidate resume text")
    job_description: Optional[str] = Field(None, description="Optional custom job description text")
    target_role: Optional[str] = Field(None, description="Optional benchmark role name")


class CareerRequest(BaseModel):
    resume_text: str = Field(..., min_length=20, description="Candidate resume text")


class CandidateItem(BaseModel):
    id: str
    name: Optional[str] = "Candidate"
    resume_text: str


class ScoreCandidatesRequest(BaseModel):
    candidates: List[CandidateItem]
    job_description: Optional[str] = None
    target_role: Optional[str] = None


class ExtractSkillsRequest(BaseModel):
    text: str = Field(..., min_length=3)


# Endpoints
@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    ats_loaded = ats_predictor is not None
    career_loaded = career_predictor is not None
    all_loaded = ats_loaded and career_loaded
    return {
        "status": "healthy" if all_loaded else "degraded",
        "ready": all_loaded,
        "service": "CognifyAI Machine Learning Engine",
        "version": "1.0.0",
        "models_loaded": {
            "ats_scorer": ats_loaded,
            "career_classifier": career_loaded,
        },
    }


@app.get("/models/status", dependencies=[Depends(verify_service_secret)])
def get_models_status():
    if not ats_predictor or not career_predictor:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="One or more ML models are not currently loaded."
        )

    return {
        "ats_scorer": {
            "status": "loaded",
            "model_type": "TF-IDF Cosine + Hybrid Taxonomy ATS Scorer",
            "supported_roles": ats_predictor.roles,
            "scoring_weights": ats_predictor.weights,
        },
        "career_classifier": {
            "status": "loaded",
            "model_architecture": career_predictor.model_type,
            "target_classes": career_predictor.classes,
            "evaluation_metrics": career_predictor.metrics
        }
    }


@app.post("/predict/ats", dependencies=[Depends(verify_service_secret)])
def predict_ats(payload: ATSRequest):
    if not ats_predictor:
        raise HTTPException(status_code=503, detail="ATS Scorer model is not loaded.")
    try:
        return ats_predictor.score_resume(
            resume_text=payload.resume_text,
            job_description=payload.job_description,
            target_role=payload.target_role
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/predict/ats/upload", dependencies=[Depends(verify_service_secret)])
async def predict_ats_upload(
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(None),
    target_role: Optional[str] = Form(None)
):
    if not ats_predictor:
        raise HTTPException(status_code=503, detail="ATS Scorer model is not loaded.")
    try:
        content = await file.read()
        extracted_text = extract_text_from_pdf(content)
        result = ats_predictor.score_resume(
            resume_text=extracted_text,
            job_description=job_description,
            target_role=target_role
        )
        result["extracted_text"] = extracted_text
        return result
    except (EmptyDocumentError, CorruptedPDFError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/predict/career", dependencies=[Depends(verify_service_secret)])
def predict_career(payload: CareerRequest):
    if not career_predictor:
        raise HTTPException(status_code=503, detail="Career Classifier model is not loaded.")
    try:
        return career_predictor.predict_career(payload.resume_text)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/predict/career/upload", dependencies=[Depends(verify_service_secret)])
async def predict_career_upload(file: UploadFile = File(...)):
    if not career_predictor:
        raise HTTPException(status_code=503, detail="Career Classifier model is not loaded.")
    try:
        content = await file.read()
        extracted_text = extract_text_from_pdf(content)
        result = career_predictor.predict_career(extracted_text)
        result["extracted_text"] = extracted_text
        return result
    except (EmptyDocumentError, CorruptedPDFError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@app.post("/score-candidates", dependencies=[Depends(verify_service_secret)])
def score_candidates(payload: ScoreCandidatesRequest):
    """
    Ranks multiple candidates against job criteria for recruiter workflows.
    """
    if not ats_predictor:
        raise HTTPException(status_code=503, detail="ATS Scorer model is not loaded.")

    scored_candidates = []
    for candidate in payload.candidates:
        try:
            score_data = ats_predictor.score_resume(
                resume_text=candidate.resume_text,
                job_description=payload.job_description,
                target_role=payload.target_role
            )
            scored_candidates.append({
                "candidate_id": candidate.id,
                "name": candidate.name,
                "ats_score": score_data["ats_score"],
                "score_breakdown": score_data["score_breakdown"],
                "matched_skills": score_data["matched_skills"],
                "missing_skills": score_data["missing_required_skills"],
                "all_extracted_skills": score_data["all_extracted_skills"],
                "sections_detected": score_data["sections_detected"],
            })
        except Exception:
            scored_candidates.append({
                "candidate_id": candidate.id,
                "name": candidate.name,
                "ats_score": 0.0,
                "score_breakdown": {},
                "matched_skills": [],
                "missing_skills": [],
                "all_extracted_skills": [],
                "error": "Failed to parse candidate resume text"
            })

    # Sort descending by ATS Score
    scored_candidates.sort(key=lambda c: c["ats_score"], reverse=True)

    return {
        "total_evaluated": len(scored_candidates),
        "target_role": payload.target_role,
        "ranked_candidates": scored_candidates
    }


@app.post("/extract-skills", dependencies=[Depends(verify_service_secret)])
def extract_skills(payload: ExtractSkillsRequest):
    return skill_extractor.extract_skills(payload.text)


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("inference_service:app", host=host, port=port, reload=False)

