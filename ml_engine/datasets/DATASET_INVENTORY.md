# CognifyAI ML Engine — Dataset Provenance & Preprocessing Inventory

**Generated At:** 2026-11-11  
**Python Version:** 3.13.14  
**Primary Dataset 1 (SHA-256):** `5c07cb96644e62c1e91e0f7c74118eb63a6a742b0c84f96c76beb2b8688a2ff1`  
- **Source:** Kaggle / GitHub Updated Resume Dataset (`UpdatedResumeDataSet.csv`)  
- **License:** Open Source / CC0  
**Primary Dataset 2 (SHA-256):** `881c30375c49cc1022257ae3c8544f4b9e6a7da09011a196c7209260dd26d8de`  
- **Source:** LiveCareer / Kaggle Resume Corpus (`Resume.csv`)  
- **License:** Open Source / CC0  

---

## 1. Project Pre-Existing Data Audit
Prior to Phase 3 initialization, an inspection across the entire CognifyAI repository (`C:\Users\DELL\cogni_ai`) verified:
- **0** pre-existing offline `.csv`, `.tsv`, `.parquet`, or `.joblib` training files existed in the repo.
- **5** resumes were stored in the Supabase test database (`resumes` table), which were generated during Phase 2 API tests and are insufficient for high-variance statistical model training.
- No confidential applicant resumes or proprietary data are included.

---

## 2. Selected Real-World Training Datasets

### A. Raw Corpora
1. **`UpdatedResumeDataSet.csv`**: 962 records with 166 unique resumes across 25 career domains.
   - *Audit finding:* Raw file contained duplicate copies of resumes (~5x duplication per category). A naive random split would have caused severe train-test data leakage. Strict deduplication was applied.
2. **`Resume.csv`**: 2,484 records across 24 industry categories. Filtered to technical disciplines (`INFORMATION-TECHNOLOGY`, `ENGINEERING`, `DIGITAL-MEDIA`) and classified into target technical roles.

### B. Cleaned Career Trajectory Dataset (`career_profiles_cleaned.csv`)
- **Total Deduplicated Labeled Tech Resumes:** 114
- **Mapped Tech Target Roles:** 8
- **Role Distribution:**
- **Full Stack Developer**: 33 labeled resumes
- **Data Analyst**: 28 labeled resumes
- **Data Scientist**: 16 labeled resumes
- **Frontend Developer**: 11 labeled resumes
- **DevOps Engineer**: 9 labeled resumes
- **Machine Learning Engineer**: 7 labeled resumes
- **Python Developer**: 5 labeled resumes
- **Cloud Engineer**: 5 labeled resumes

### C. Benchmark Job Descriptions (`benchmark_job_descriptions.csv`)
- **Total Role Profiles:** 9
- **Roles Covered:** Data Scientist, Machine Learning Engineer, Frontend Developer, Full Stack Developer, DevOps Engineer, Cloud Engineer, Data Analyst, Python Developer, AI Engineer
- **Purpose:** Used for ground-truth ATS TF-IDF vocabulary fitting, cosine semantic similarity benchmarking, and missing skill calculation.

---

## 3. Data Cleaning and Preprocessing Pipeline
1. **Sanitization:** Stripped HTML tags, email addresses, phone numbers, and URLs while preserving tech symbols (`C++`, `C#`, `.NET`, `Node.js`).
2. **Deduplication:** Dropped verbatim duplicate resumes within the same role to prevent data leakage between training and testing folds.
3. **Noise Filtering:** Discarded candidate texts with fewer than 2 recognizable technical skills.
4. **Leakage Prevention:** TF-IDF feature transformations and classifiers are fitted **strictly on training partitions**; test sets remain isolated.
