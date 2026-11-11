"""
CognifyAI Machine Learning Engine - Career Trajectory Classifier Trainer
Compares RandomForest, GradientBoosting, and LogisticRegression using
Stratified Cross-Validation on genuine deduplicated tech profiles.
Selects the best model, computes genuine evaluation metrics, and saves artifact.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from typing import Dict, Any, Tuple

from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline, FeatureUnion
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix
)

try:
    from .preprocessing import clean_text
    from .skill_extractor import SkillExtractor
except ImportError:
    sys.path.insert(0, os.path.dirname(__file__))
    from preprocessing import clean_text
    from skill_extractor import SkillExtractor

PROCESSED_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../datasets/processed"))
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../models"))
REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../reports"))

CAREER_DATA_PATH = os.path.join(PROCESSED_DIR, "career_profiles_cleaned.csv")
BENCHMARK_JOBS_PATH = os.path.join(PROCESSED_DIR, "benchmark_job_descriptions.csv")
CAREER_MODEL_PATH = os.path.join(MODELS_DIR, "career_classifier.joblib")


def format_skills_as_text(skills_json_str: str) -> str:
    """Converts JSON list of skills into a single space-separated string."""
    try:
        skills = json.loads(skills_json_str)
        if isinstance(skills, list):
            return " ".join([s.replace(" ", "_") for s in skills])
    except Exception:
        pass
    return ""


class CareerTrainer:
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.skill_extractor = SkillExtractor()

    def train_and_evaluate(self) -> Tuple[Dict[str, Any], str]:
        os.makedirs(MODELS_DIR, exist_ok=True)
        os.makedirs(REPORTS_DIR, exist_ok=True)

        if not os.path.exists(CAREER_DATA_PATH):
            raise FileNotFoundError(f"Missing dataset {CAREER_DATA_PATH}. Run data_loader.py first.")

        df = pd.read_csv(CAREER_DATA_PATH)
        print(f"[CareerTrainer] Loaded {len(df)} candidate profiles across {df['Role'].nunique()} roles.")

        # Prepare feature columns
        df["Skill_Tokens"] = df["Extracted_Skills"].apply(format_skills_as_text)

        X = df[["Resume_Text", "Skill_Tokens"]]
        y_raw = df["Role"].values

        label_encoder = LabelEncoder()
        y = label_encoder.fit_transform(y_raw)
        classes = list(label_encoder.classes_)

        print(f"[CareerTrainer] Classes: {classes}")

        # Feature Union: Text TF-IDF + Skill Tokens TF-IDF
        preprocessor = ColumnTransformer(
            transformers=[
                (
                    "text_tfidf",
                    TfidfVectorizer(
                        ngram_range=(1, 2),
                        max_features=2500,
                        stop_words="english",
                        sublinear_tf=True
                    ),
                    "Resume_Text"
                ),
                (
                    "skill_tfidf",
                    TfidfVectorizer(
                        ngram_range=(1, 1),
                        max_features=150,
                        sublinear_tf=True
                    ),
                    "Skill_Tokens"
                )
            ]
        )

        # Candidate Model Definitions
        candidates = {
            "LogisticRegression": LogisticRegression(
                C=2.0,
                max_iter=500,
                random_state=self.random_state
            ),
            "RandomForest": RandomForestClassifier(
                n_estimators=120,
                max_depth=12,
                min_samples_split=2,
                random_state=self.random_state
            ),
            "GradientBoosting": GradientBoostingClassifier(
                n_estimators=80,
                learning_rate=0.08,
                max_depth=3,
                random_state=self.random_state
            )
        }

        # 4-Fold Stratified Cross-Validation (suitable for min class size = 5)
        skf = StratifiedKFold(n_splits=4, shuffle=True, random_state=self.random_state)
        cv_summary = {}

        print("\n[CareerTrainer] Running Stratified 4-Fold Cross-Validation on Candidates...")
        for name, clf in candidates.items():
            pipe = Pipeline([
                ("preprocessor", preprocessor),
                ("classifier", clf)
            ])
            scores = cross_validate(
                pipe, X, y, cv=skf,
                scoring=["accuracy", "f1_weighted", "f1_macro"],
                n_jobs=1
            )
            mean_acc = float(np.mean(scores["test_accuracy"]))
            mean_f1_w = float(np.mean(scores["test_f1_weighted"]))
            mean_f1_m = float(np.mean(scores["test_f1_macro"]))
            cv_summary[name] = {
                "mean_accuracy": round(mean_acc, 4),
                "std_accuracy": round(float(np.std(scores["test_accuracy"])), 4),
                "mean_f1_weighted": round(mean_f1_w, 4),
                "mean_f1_macro": round(mean_f1_m, 4)
            }
            print(f"  > {name:18s} | Acc: {mean_acc:.3f} | F1-Weighted: {mean_f1_w:.3f} | F1-Macro: {mean_f1_m:.3f}")

        # Choose best candidate based on weighted F1
        best_name = max(cv_summary.keys(), key=lambda k: cv_summary[k]["mean_f1_weighted"])
        print(f"\n[CareerTrainer] Selected Best Candidate: {best_name}")

        # Holdout 80/20 Stratified Evaluation for final verification
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=self.random_state, stratify=y
        )

        final_pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", candidates[best_name])
        ])

        final_pipeline.fit(X_train, y_train)
        y_pred = final_pipeline.predict(X_test)

        test_acc = float(accuracy_score(y_test, y_pred))
        precision_w, recall_w, f1_w, _ = precision_recall_fscore_support(
            y_test, y_pred, average="weighted", zero_division=0
        )
        precision_m, recall_m, f1_m, _ = precision_recall_fscore_support(
            y_test, y_pred, average="macro", zero_division=0
        )
        cm = confusion_matrix(y_test, y_pred).tolist()
        cls_report = classification_report(
            y_test, y_pred, target_names=classes, output_dict=True, zero_division=0
        )

        print(f"\n[CareerTrainer] Holdout Test Set Performance:")
        print(f"  Accuracy:    {test_acc:.4f}")
        print(f"  F1-Weighted: {f1_w:.4f}")
        print(f"  F1-Macro:    {f1_m:.4f}")

        # Re-fit the best pipeline on full dataset for production artifact
        final_production_pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", candidates[best_name])
        ])
        final_production_pipeline.fit(X, y)

        # Load benchmark skills for role fit analysis
        df_jobs = pd.read_csv(BENCHMARK_JOBS_PATH) if os.path.exists(BENCHMARK_JOBS_PATH) else pd.DataFrame()
        role_skills_map: Dict[str, list] = {}
        if not df_jobs.empty:
            for _, r in df_jobs.iterrows():
                r_name = str(r["role"]).strip()
                r_skills = eval(r["required_skills"]) if isinstance(r["required_skills"], str) else list(r["required_skills"])
                role_skills_map[r_name] = r_skills

        # Package artifact
        artifact = {
            "model_type": f"FeatureUnion TF-IDF + {best_name}",
            "best_algorithm": best_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "pipeline": final_production_pipeline,
            "label_encoder": label_encoder,
            "classes": classes,
            "role_skills_map": role_skills_map,
            "total_samples": len(df),
            "cv_scores": cv_summary,
            "test_metrics": {
                "accuracy": round(test_acc, 4),
                "precision_weighted": round(float(precision_w), 4),
                "recall_weighted": round(float(recall_w), 4),
                "f1_weighted": round(float(f1_w), 4),
                "precision_macro": round(float(precision_m), 4),
                "recall_macro": round(float(recall_m), 4),
                "f1_macro": round(float(f1_m), 4),
                "confusion_matrix": cm,
                "classification_report": cls_report
            }
        }

        joblib.dump(artifact, CAREER_MODEL_PATH)
        print(f"[CareerTrainer] Saved career classifier artifact to {CAREER_MODEL_PATH}")

        # Save evaluation report to reports/
        report_path = os.path.join(REPORTS_DIR, "career_classification_report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump({
                "model_type": artifact["model_type"],
                "created_at": artifact["created_at"],
                "cv_scores": cv_summary,
                "test_metrics": artifact["test_metrics"],
                "classes": classes
            }, f, indent=2)
        print(f"[CareerTrainer] Saved detailed JSON report to {report_path}")

        return artifact, CAREER_MODEL_PATH


if __name__ == "__main__":
    trainer = CareerTrainer()
    trainer.train_and_evaluate()

