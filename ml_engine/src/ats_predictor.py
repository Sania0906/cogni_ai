"""
CognifyAI Machine Learning Engine - ATS Predictor Module
Provides transparent, explainable ATS resume evaluation against
job descriptions or target roles using TF-IDF cosine similarity,
hybrid skill extraction, and functional section completeness.
"""

import os
import sys
import joblib
import numpy as np
from typing import Dict, List, Optional, Any, Union
from sklearn.metrics.pairwise import cosine_similarity

try:
    from .preprocessing import clean_text, extract_text_from_pdf, detect_sections
    from .skill_extractor import SkillExtractor
except ImportError:
    sys.path.insert(0, os.path.dirname(__file__))
    from preprocessing import clean_text, extract_text_from_pdf, detect_sections
    from skill_extractor import SkillExtractor

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models"))
DEFAULT_ATS_MODEL_PATH = os.path.join(MODELS_DIR, "ats_scorer.joblib")


class ATSPredictor:
    def __init__(self, model_path: Optional[str] = None):
        resolved_dir = os.path.abspath(
            os.getenv("ML_MODELS_DIR") or MODELS_DIR
        )
        default_path = os.getenv("ATS_MODEL_PATH") or os.path.join(resolved_dir, "ats_scorer.joblib")
        self.model_path = model_path or default_path
        self.skill_extractor = SkillExtractor()
        self._load_model()

    def _load_model(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"ATS model artifact not found at {self.model_path}. Run ats_trainer.py first."
            )
        artifact = joblib.load(self.model_path)
        self.vectorizer = artifact["vectorizer"]
        self.benchmark_profiles = artifact["benchmark_profiles"]
        self.roles = artifact["roles"]
        self.weights = artifact.get("weights", {
            "skill_coverage": 0.50,
            "semantic_similarity": 0.35,
            "section_completeness": 0.15
        })

    def score_pdf(
        self,
        pdf_source: Union[str, bytes],
        job_description: Optional[str] = None,
        target_role: Optional[str] = None
    ) -> Dict[str, Any]:
        """Extracts text from PDF and performs ATS scoring."""
        extracted_text = extract_text_from_pdf(pdf_source)
        return self.score_resume(
            resume_text=extracted_text,
            job_description=job_description,
            target_role=target_role
        )

    def score_resume(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
        target_role: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calculates explainable ATS score for candidate resume.
        Supports custom job description or target role benchmark matching.
        """
        cleaned_resume = clean_text(resume_text)
        if len(cleaned_resume) < 20:
            raise ValueError("Resume text is too brief to analyze (minimum 20 characters required).")

        # 1. Section Completeness Analysis
        section_info = detect_sections(cleaned_resume)
        section_completeness_pct = section_info["completeness_score"]

        # 2. Extract Resume Skills
        extracted_resume_data = self.skill_extractor.extract_skills(cleaned_resume)
        resume_skills = extracted_resume_data["matched_skills"]

        # 3. Resolve Job Profile / Benchmark
        effective_target_role = target_role
        if not job_description:
            if not effective_target_role or effective_target_role not in self.benchmark_profiles:
                # Find best matching role among benchmarks using TF-IDF cosine similarity
                resume_vec = self.vectorizer.transform([cleaned_resume]).toarray()[0]
                best_sim = -1.0
                best_role = self.roles[0] if self.roles else "Full Stack Developer"
                for role, b_data in self.benchmark_profiles.items():
                    sim = float(cosine_similarity(
                        resume_vec.reshape(1, -1),
                        b_data["vector"].reshape(1, -1)
                    )[0][0])
                    if sim > best_sim:
                        best_sim = sim
                        best_role = role
                effective_target_role = best_role

            bench_data = self.benchmark_profiles[effective_target_role]
            job_vec = bench_data["vector"]
            required_skills = bench_data["required_skills"]
            job_desc_used = bench_data["description"]
        else:
            cleaned_job = clean_text(job_description)
            job_desc_used = cleaned_job
            job_vec = self.vectorizer.transform([cleaned_job]).toarray()[0]
            # Extract required skills from custom JD
            jd_skill_data = self.skill_extractor.extract_skills(cleaned_job)
            required_skills = jd_skill_data["matched_skills"]
            if not required_skills and effective_target_role and effective_target_role in self.benchmark_profiles:
                required_skills = self.benchmark_profiles[effective_target_role]["required_skills"]

        # 4. Compute Semantic Cosine Similarity
        resume_vec = self.vectorizer.transform([cleaned_resume]).toarray()[0]
        cos_sim = float(cosine_similarity(
            resume_vec.reshape(1, -1),
            job_vec.reshape(1, -1)
        )[0][0])
        # Bound between 0.0 and 1.0
        cos_sim = max(0.0, min(1.0, cos_sim))

        # 5. Compute Skill Coverage
        coverage = self.skill_extractor.compute_skill_coverage(resume_skills, required_skills)
        skill_coverage_pct = coverage["coverage_percentage"]

        # 6. Compute Transparent ATS Score
        w_skill = self.weights.get("skill_coverage", 0.50)
        w_sim = self.weights.get("semantic_similarity", 0.35)
        w_sec = self.weights.get("section_completeness", 0.15)

        # Scale cosine similarity: standard resume-JD cosine sim typically falls between 0.10 and 0.70
        # We normalize with a 1.5x multiplier capped at 100 for intuitive candidate readability
        sim_score_pct = min(100.0, (cos_sim * 100) * 1.5)

        raw_score = (
            (w_skill * skill_coverage_pct) +
            (w_sim * sim_score_pct) +
            (w_sec * section_completeness_pct)
        )
        final_ats_score = round(max(0.0, min(100.0, raw_score)), 1)

        # 7. Actionable Recommendations
        recommendations = list(section_info.get("recommendations", []))
        if coverage["missing_required"]:
            top_missing = coverage["missing_required"][:4]
            recommendations.append(
                f"Add demonstrated experience with target requirements: {', '.join(top_missing)}."
            )
        if skill_coverage_pct < 50.0:
            recommendations.append(
                "Incorporate more domain-specific technical terminology aligned with the job description."
            )
        if cos_sim < 0.15:
            recommendations.append(
                "Strengthen project descriptions with specific technical keywords and measurable outcomes."
            )
        if not recommendations:
            recommendations.append(
                "Strong profile alignment! Continue highlighting quantifiable business impact and recent architecture achievements."
            )

        return {
            "ats_score": final_ats_score,
            "target_role": effective_target_role,
            "score_breakdown": {
                "skill_coverage_score": round(w_skill * skill_coverage_pct, 1),
                "semantic_similarity_score": round(w_sim * sim_score_pct, 1),
                "section_completeness_score": round(w_sec * section_completeness_pct, 1),
                "raw_cosine_similarity": round(cos_sim, 4),
                "raw_skill_coverage_pct": round(skill_coverage_pct, 1),
                "raw_section_completeness_pct": section_completeness_pct,
            },
            "matched_skills": coverage["matched_required"],
            "missing_required_skills": coverage["missing_required"],
            "additional_skills": coverage["additional_skills"],
            "all_extracted_skills": resume_skills,
            "sections_detected": section_info["sections_detected"],
            "actionable_recommendations": recommendations,
        }


if __name__ == "__main__":
    predictor = ATSPredictor()
    sample_resume = """
    Jane Doe - Full Stack Developer
    Email: jane@example.com | Phone: 555-0199
    
    Professional Summary:
    Full Stack Engineer with 4 years of experience building scalable web applications with React, TypeScript, and Node.js.
    
    Work Experience:
    Senior Software Engineer - Tech Solutions (2022 - Present)
    - Developed enterprise REST APIs using Node.js, Express.js, and PostgreSQL.
    - Built responsive frontend applications using React, TypeScript, and TailwindCSS.
    - Implemented containerized microservices using Docker and CI/CD pipelines.
    
    Skills:
    React, TypeScript, JavaScript, Node.js, Express.js, PostgreSQL, Docker, Git, REST APIs, HTML5, CSS3.
    
    Education:
    Bachelor of Science in Computer Science - State University
    """

    res = predictor.score_resume(sample_resume, target_role="Full Stack Developer")
    print("\n--- Sample ATS Prediction ---")
    print(f"Target Role: {res['target_role']}")
    print(f"ATS Score: {res['ats_score']} / 100")
    print(f"Score Breakdown: {res['score_breakdown']}")
    print(f"Matched Skills: {res['matched_skills']}")
    print(f"Missing Required Skills: {res['missing_required_skills']}")
    print(f"Recommendations: {res['actionable_recommendations']}")
