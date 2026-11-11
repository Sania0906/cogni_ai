"""
CognifyAI Machine Learning Engine - ATS Model Trainer Module
Fits TF-IDF vectorizer strictly on training data (resume corpus + benchmark job descriptions),
computes ground-truth role representations, and serializes the ATS scorer artifact.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from .preprocessing import clean_text, detect_sections
    from .skill_extractor import SkillExtractor, CANONICAL_SKILLS_TAXONOMY
except ImportError:
    sys.path.insert(0, os.path.dirname(__file__))
    from preprocessing import clean_text, detect_sections
    from skill_extractor import SkillExtractor, CANONICAL_SKILLS_TAXONOMY

PROCESSED_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../datasets/processed"))
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models"))
REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../reports"))

CAREER_DATA_PATH = os.path.join(PROCESSED_DIR, "career_profiles_cleaned.csv")
BENCHMARK_JOBS_PATH = os.path.join(PROCESSED_DIR, "benchmark_job_descriptions.csv")
ATS_MODEL_PATH = os.path.join(MODELS_DIR, "ats_scorer.joblib")


class ATSTrainer:
    def __init__(self, max_features: int = 5000):
        self.max_features = max_features
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=self.max_features,
            stop_words="english",
            sublinear_tf=True
        )
        self.skill_extractor = SkillExtractor()

    def train_and_save(self) -> Tuple[Dict[str, Any], str]:
        os.makedirs(MODELS_DIR, exist_ok=True)
        os.makedirs(REPORTS_DIR, exist_ok=True)

        if not os.path.exists(CAREER_DATA_PATH) or not os.path.exists(BENCHMARK_JOBS_PATH):
            raise FileNotFoundError(
                f"Missing processed datasets in {PROCESSED_DIR}. Run data_loader.py first."
            )

        df_career = pd.read_csv(CAREER_DATA_PATH)
        df_jobs = pd.read_csv(BENCHMARK_JOBS_PATH)

        print(f"[ATSTrainer] Fitting TF-IDF on {len(df_career)} resumes and {len(df_jobs)} job benchmarks...")

        # Strict corpus assembly: resume text + job descriptions
        corpus = list(df_career["Resume_Text"].dropna()) + list(df_jobs["description"].dropna())
        self.vectorizer.fit(corpus)

        print(f"[ATSTrainer] Vocabulary size: {len(self.vectorizer.vocabulary_)} n-grams.")

        # Compute benchmark job profile vectors and skill sets
        benchmark_profiles: Dict[str, Dict[str, Any]] = {}
        for _, row in df_jobs.iterrows():
            role = str(row["role"]).strip()
            desc = str(row["description"]).strip()
            req_skills = eval(row["required_skills"]) if isinstance(row["required_skills"], str) else list(row["required_skills"])
            
            vec = self.vectorizer.transform([desc]).toarray()[0]
            benchmark_profiles[role] = {
                "role": role,
                "description": desc,
                "required_skills": req_skills,
                "vector": vec,
            }

        # Build training metadata
        artifact = {
            "model_type": "TF-IDF Cosine + Hybrid Taxonomy ATS Scorer",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "vectorizer": self.vectorizer,
            "benchmark_profiles": benchmark_profiles,
            "roles": list(benchmark_profiles.keys()),
            "weights": {
                "skill_coverage": 0.50,
                "semantic_similarity": 0.35,
                "section_completeness": 0.15
            },
            "training_samples": len(df_career),
            "vocabulary_size": len(self.vectorizer.vocabulary_),
        }

        # Save model artifact
        joblib.dump(artifact, ATS_MODEL_PATH)
        print(f"[ATSTrainer] ATS Scorer successfully saved to: {ATS_MODEL_PATH}")

        # Compute validation benchmark: In-domain vs Out-of-domain alignment
        eval_results = self._evaluate_benchmark_alignment(df_career, benchmark_profiles)

        report_path = os.path.join(REPORTS_DIR, "ats_validation_report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(eval_results, f, indent=2)
        print(f"[ATSTrainer] Validation report saved to: {report_path}")

        return eval_results, ATS_MODEL_PATH

    def _evaluate_benchmark_alignment(
        self,
        df_career: pd.DataFrame,
        benchmark_profiles: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculates in-domain vs cross-domain cosine similarity across real resumes.
        Verifies that resumes achieve statistically higher similarity with their true role benchmark.
        """
        role_stats: Dict[str, Dict[str, float]] = {}

        for role, b_data in benchmark_profiles.items():
            in_role_df = df_career[df_career["Role"] == role]
            out_role_df = df_career[df_career["Role"] != role]

            if len(in_role_df) == 0:
                continue

            # In-role similarity
            in_vecs = self.vectorizer.transform(in_role_df["Resume_Text"])
            in_sims = cosine_similarity(in_vecs, b_data["vector"].reshape(1, -1)).flatten()

            # Out-of-role similarity
            out_sims = np.array([])
            if len(out_role_df) > 0:
                out_vecs = self.vectorizer.transform(out_role_df["Resume_Text"])
                out_sims = cosine_similarity(out_vecs, b_data["vector"].reshape(1, -1)).flatten()

            role_stats[role] = {
                "samples": int(len(in_role_df)),
                "in_domain_mean_similarity": float(round(np.mean(in_sims), 4)),
                "in_domain_std": float(round(np.std(in_sims), 4)),
                "out_domain_mean_similarity": float(round(np.mean(out_sims), 4)) if len(out_sims) > 0 else 0.0,
                "similarity_margin": float(round(np.mean(in_sims) - (np.mean(out_sims) if len(out_sims) > 0 else 0.0), 4))
            }

        return {
            "evaluation_timestamp": datetime.now(timezone.utc).isoformat(),
            "benchmark_roles_count": len(role_stats),
            "role_alignment_stats": role_stats,
            "overall_mean_in_domain_similarity": float(round(np.mean([s["in_domain_mean_similarity"] for s in role_stats.values()]), 4)),
            "overall_mean_out_domain_similarity": float(round(np.mean([s["out_domain_mean_similarity"] for s in role_stats.values()]), 4)),
        }


if __name__ == "__main__":
    trainer = ATSTrainer()
    results, path = trainer.train_and_save()
    print("\n--- ATS Benchmark Evaluation Summary ---")
    for role, stats in results["role_alignment_stats"].items():
        print(f"Role: {role:25s} | In-Domain Sim: {stats['in_domain_mean_similarity']:.3f} | Out-Domain Sim: {stats['out_domain_mean_similarity']:.3f} | Margin: +{stats['similarity_margin']:.3f}")

