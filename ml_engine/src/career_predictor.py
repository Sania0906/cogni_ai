"""
CognifyAI Machine Learning Engine - Career Trajectory Predictor Module
Loads the trained career classifier pipeline, generates probabilistic
role classifications, identifies skill readiness, and recommends transition pathways.
"""

import os
import sys
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Union

try:
    from .preprocessing import clean_text, extract_text_from_pdf
    from .skill_extractor import SkillExtractor
    from .career_trainer import format_skills_as_text
except ImportError:
    sys.path.insert(0, os.path.dirname(__file__))
    from preprocessing import clean_text, extract_text_from_pdf
    from skill_extractor import SkillExtractor
    from career_trainer import format_skills_as_text

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models"))
DEFAULT_CAREER_MODEL_PATH = os.path.join(MODELS_DIR, "career_classifier.joblib")


class CareerPredictor:
    def __init__(self, model_path: Optional[str] = None):
        resolved_dir = os.path.abspath(
            os.getenv("ML_MODELS_DIR") or MODELS_DIR
        )
        default_path = os.getenv("CAREER_MODEL_PATH") or os.path.join(resolved_dir, "career_classifier.joblib")
        self.model_path = model_path or default_path
        self.skill_extractor = SkillExtractor()
        self._load_model()

    def _load_model(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Career classifier artifact not found at {self.model_path}. Run career_trainer.py first."
            )
        artifact = joblib.load(self.model_path)
        self.pipeline = artifact["pipeline"]
        self.label_encoder = artifact["label_encoder"]
        self.classes = artifact["classes"]
        self.role_skills_map = artifact.get("role_skills_map", {})
        self.model_type = artifact.get("model_type", "Career Classifier")
        self.metrics = artifact.get("test_metrics", {})

    def predict_pdf(self, pdf_source: Union[str, bytes]) -> Dict[str, Any]:
        """Extracts text from PDF and predicts career trajectory."""
        text = extract_text_from_pdf(pdf_source)
        return self.predict_career(text)

    def predict_career(self, resume_text: str) -> Dict[str, Any]:
        """
        Predicts best-fit job role, alternative career trajectories,
        and skill readiness using the trained ML pipeline.
        """
        cleaned = clean_text(resume_text)
        if len(cleaned) < 20:
            raise ValueError("Resume text is too brief to analyze (minimum 20 characters required).")

        # Extract skills
        skill_res = self.skill_extractor.extract_skills(cleaned)
        extracted_skills = skill_res["matched_skills"]
        skill_tokens = " ".join([s.replace(" ", "_") for s in extracted_skills])

        # Prepare single row DataFrame matching pipeline schema
        df_input = pd.DataFrame([{
            "Resume_Text": cleaned,
            "Skill_Tokens": skill_tokens
        }])

        # Predict class probabilities
        probs = self.pipeline.predict_proba(df_input)[0]
        top_idx = int(np.argmax(probs))
        predicted_role = str(self.classes[top_idx])
        top_confidence = float(probs[top_idx])

        # Rank all alternative trajectories
        ranked_trajectories: List[Dict[str, Any]] = []
        for idx in np.argsort(-probs):
            role_name = str(self.classes[idx])
            p = float(probs[idx])
            if role_name == predicted_role and len(ranked_trajectories) == 0:
                continue

            suitability = "High" if p >= 0.25 else ("Moderate" if p >= 0.10 else "Potential")
            ranked_trajectories.append({
                "role": role_name,
                "probability": round(p, 4),
                "probability_percentage": round(p * 100, 1),
                "suitability": suitability
            })

        # Calculate skill fit against predicted role benchmark
        benchmark_skills = self.role_skills_map.get(predicted_role, [])
        coverage_data = self.skill_extractor.compute_skill_coverage(
            extracted_skills, benchmark_skills
        )

        readiness_score = coverage_data["coverage_percentage"]

        # Recommendations for career transition / growth
        recommendations = []
        if coverage_data["missing_required"]:
            recommendations.append(
                f"To strengthen alignment for {predicted_role}, master these key competencies: {', '.join(coverage_data['missing_required'][:3])}."
            )
        if ranked_trajectories and ranked_trajectories[0]["probability"] >= 0.20:
            alt_role = ranked_trajectories[0]["role"]
            recommendations.append(
                f"Strong adjacent affinity detected for {alt_role} ({ranked_trajectories[0]['probability_percentage']}% probability)."
            )
        if readiness_score >= 80:
            recommendations.append("High profile maturity: Ready for mid/senior level applications.")
        elif readiness_score >= 50:
            recommendations.append("Solid foundation: Focus on targeted project portfolios to bridge the remaining skill gap.")

        return {
            "predicted_role": predicted_role,
            "confidence_score": round(top_confidence, 4),
            "confidence_percentage": round(top_confidence * 100, 1),
            "model_architecture": self.model_type,
            "alternative_trajectories": ranked_trajectories[:4],
            "candidate_skills": extracted_skills,
            "role_readiness": {
                "benchmark_role": predicted_role,
                "readiness_score": readiness_score,
                "matched_skills": coverage_data["matched_required"],
                "missing_critical_skills": coverage_data["missing_required"],
            },
            "career_transition_advice": recommendations,
        }


if __name__ == "__main__":
    predictor = CareerPredictor()
    sample = """
    Data Analyst with strong SQL query optimization skills.
    Proficient in Python, Pandas, NumPy, Tableau, PostgreSQL, database reporting,
    and business intelligence dashboards.
    """
    res = predictor.predict_career(sample)
    print("\n--- Sample Career Prediction ---")
    print(f"Predicted Role: {res['predicted_role']} ({res['confidence_percentage']}%)")
    print(f"Readiness Score: {res['role_readiness']['readiness_score']}%")
    print(f"Matched Skills: {res['role_readiness']['matched_skills']}")
    print(f"Missing Skills: {res['role_readiness']['missing_critical_skills']}")
    print(f"Alternative Roles: {res['alternative_trajectories']}")

