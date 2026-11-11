"""
CognifyAI Machine Learning Engine - Master Training Orchestration Script
Runs data ingestion, preprocessing, ATS model training, Career Classifier training,
and evaluation reporting sequentially.
"""

import sys
import os
import time

try:
    from src.data_loader import process_dataset
    from src.ats_trainer import ATSTrainer
    from src.career_trainer import CareerTrainer
    from src.evaluation import generate_evaluation_reports
except ImportError:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
    from data_loader import process_dataset
    from ats_trainer import ATSTrainer
    from career_trainer import CareerTrainer
    from evaluation import generate_evaluation_reports


def train_all():
    print("=" * 70)
    print(" CognifyAI Machine Learning Engine - Master Pipeline Training")
    print("=" * 70)
    start_time = time.time()

    # Step 1: Ingest & Preprocess
    print("\n>>> Step 1/4: Ingesting & Cleaning Real Datasets...")
    process_dataset()

    # Step 2: Train Model 1 (ATS Scorer)
    print("\n>>> Step 2/4: Training Model 1 (ATS Resume Scorer)...")
    ats_trainer = ATSTrainer()
    ats_trainer.train_and_save()

    # Step 3: Train Model 2 (Career Trajectory Classifier)
    print("\n>>> Step 3/4: Training Model 2 (Career Trajectory Classifier)...")
    career_trainer = CareerTrainer()
    career_trainer.train_and_evaluate()

    # Step 4: Generate Evaluation Reports
    print("\n>>> Step 4/4: Compiling Evaluation Reports...")
    generate_evaluation_reports()

    duration = round(time.time() - start_time, 2)
    print("\n" + "=" * 70)
    print(f" [SUCCESS] Complete ML Engine Training Finished in {duration}s!")
    print("=" * 70)


if __name__ == "__main__":
    train_all()

