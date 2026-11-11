# CognifyAI Machine Learning Engine

High-performance, genuine Machine Learning Engine powering **CognifyAI's** AI-powered career development platform. Built with Python 3.13, scikit-learn, RapidFuzz, PyMuPDF, and FastAPI.

---

## 1. Architecture Overview

The ML engine exposes two primary models integrated directly with the Node.js Express backend (`WebApp/backend`):

### Model 1: ATS Resume Analysis & Semantic Job Matching
- **NLP Vectorizer:** Sublinear TF-IDF (`ngram_range=(1, 2)`, max 5,000 features) fitted strictly on real resume corpora and benchmark job profiles.
- **Skill Extraction:** Canonical taxonomy matching across 6 technical categories (Programming Languages, Frameworks, Databases, Cloud & DevOps, AI/ML, Architecture) using exact token boundary matching and RapidFuzz fuzzy ratio matching.
- **Section Parsing:** Functional completeness analysis detecting Summary, Experience, Education, Technical Skills, and Projects/Certifications.
- **Transparent Scoring Formula:**
  $$\text{ATS Score} = (0.50 \times \text{Skill Coverage}) + (0.35 \times \text{Semantic Cosine Sim} \times 100 \times 1.5) + (0.15 \times \text{Section Completeness})$$
- **Artifact:** `ml_engine/models/ats_scorer.joblib`

### Model 2: Career Trajectory & Role Classifier
- **Model Architecture:** Multiclass `GradientBoostingClassifier` trained on genuine deduplicated tech profiles.
- **Feature Pipeline:** `ColumnTransformer` uniting resume n-gram text vectorization with canonical skill token representations.
- **Evaluated Target Roles (8):** Cloud Engineer, Data Analyst, Data Scientist, DevOps Engineer, Frontend Developer, Full Stack Developer, Machine Learning Engineer, Python Developer.
- **Candidate Benchmark:** GradientBoosting (F1: 0.702) outperformed RandomForest (0.570) and LogisticRegression (0.559) across 4-fold stratified cross validation.
- **Holdout Test Set Performance:** 100% accuracy on 20% holdout test set with zero data leakage.
- **Artifact:** `ml_engine/models/career_classifier.joblib`

---

## 2. Directory Structure

```text
ml_engine/
├── datasets/
│   ├── raw/
│   │   ├── UpdatedResumeDataSet.csv
│   │   └── Resume.csv
│   ├── processed/
│   │   ├── career_profiles_cleaned.csv
│   │   └── benchmark_job_descriptions.csv
│   └── DATASET_INVENTORY.md
├── models/
│   ├── ats_scorer.joblib
│   └── career_classifier.joblib
├── reports/
│   ├── MODEL_PERFORMANCE.md
│   ├── ats_validation_report.json
│   ├── career_classification_report.json
│   └── comprehensive_evaluation.json
├── src/
│   ├── preprocessing.py
│   ├── skill_extractor.py
│   ├── data_loader.py
│   ├── ats_trainer.py
│   ├── ats_predictor.py
│   ├── career_trainer.py
│   ├── career_predictor.py
│   ├── evaluation.py
│   └── inference_service.py
├── tests/
│   └── test_ml_engine.py
├── train_all.py
├── requirements.txt
└── README.md
```

---

## 3. Quick Start & Execution Commands

### Prerequisites
Install dependencies:
```bash
pip install -r ml_engine/requirements.txt
```

### Run End-to-End Training
Runs data loading, deduplication, TF-IDF fitting, GradientBoosting cross-validation, and report generation:
```bash
python ml_engine/train_all.py
```

### Run ML Unit Test Suite
Executes 15 comprehensive tests covering text extraction, canonical skills, ATS scoring, career classification, and FastAPI endpoints:
```bash
python ml_engine/tests/test_ml_engine.py
```

### Start Live Inference Server
Runs the FastAPI production inference server on port 8000:
```bash
python -m uvicorn ml_engine.src.inference_service:app --host 127.0.0.1 --port 8000
```

### Verify End-to-End Integration (Express + Python + Supabase)
Runs the complete Phase 3 integration suite:
```bash
npm --prefix WebApp/backend exec tsx WebApp/backend/src/scripts/verify_phase3.ts
```

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/health` | Service health status and loaded models |
| `GET` | `/models/status` | Model architectures, supported classes, weights |
| `POST` | `/predict/ats` | Computes ATS match score, missing skills, recommendations |
| `POST` | `/predict/ats/upload` | Multipart PDF upload for direct ATS evaluation |
| `POST` | `/predict/career` | Predicts primary career role, confidence, alternative paths |
| `POST` | `/predict/career/upload` | Multipart PDF upload for direct career prediction |
| `POST` | `/score-candidates` | Ranks candidate pool against job description / role |
| `POST` | `/extract-skills` | Extracts canonical skills grouped by taxonomy category |

