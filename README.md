# CognifyAI — AI-Powered Career Development Platform

CognifyAI is a unified multi-platform career development ecosystem combining a React 19 web application, a React Native (Expo Go) mobile application, a Node.js/Express TypeScript API, a Python FastAPI machine learning inference microservice, and a Supabase PostgreSQL backend.

---

## System Architecture

```text
+---------------------------+        +---------------------------+
|   WebApp (React 19 +      |        |  MobileApp (Expo SDK 57 / |
|   TanStack Start / Vite)  |        |  React Native 0.86.2)     |
|   Dev: :5173 (proxied)    |        |  LAN: EXPO_PUBLIC_API_URL |
+-------------+-------------+        +-------------+-------------+
              |                                    |
              +-----------------+------------------+
                                | HTTPS / REST JSON + Bearer JWT
                                v
              +------------------------------------+
              |   Unified Backend API (Express TS) |
              |   WebApp/backend/src/server.ts     |
              |   Bound to 0.0.0.0:5000            |
              |   (Serves production SPA in prod)  |
              +--------+------------------+--------+
                       |                  |
         Supabase SDK  |                  | HTTP REST JSON
         (Auth & DB)   v                  v (:8000)
      +--------------------+    +----------------------------------+
      | Supabase           |    | Python ML Engine (FastAPI)       |
      | - Supabase Auth    |    | ml_engine/src/inference_service  |
      | - PostgreSQL (23   |    | - Model 1: Hybrid TF-IDF + Skill |
      |   application      |    |   Taxonomy ATS Scorer            |
      |   tables)          |    | - Model 2: FeatureUnion TF-IDF + |
      +--------------------+    |   GradientBoosting Role Classifier|
                                +----------------------------------+
```

### Core Components
1. **`WebApp/`**: React 19 + TypeScript + TanStack Start + TanStack Query + Tailwind CSS web frontend.
2. **`WebApp/backend/`**: Node.js (`v24` ESM) + Express + TypeScript backend enforcing Supabase Auth JWT verification, database-trusted RBAC (`user`, `organization`, `admin`), Multer upload validation, and ML orchestration.
3. **`MobileApp/`**: Expo SDK 57 (`~57.0.10`) React Native mobile client sharing the exact same Express endpoints and PostgreSQL persistence (`User`, `Organization/Recruiter`, and `Admin` role views).
4. **`ml_engine/`**: Python `3.13` FastAPI service serving two `joblib`-serialized scikit-learn pipelines trained on real developer resume datasets (`ml_engine/models/`).

---

## Prerequisites

- **Node.js** `>= 20` (verified on `v24.19.0`) & **npm**
- **Python** `>= 3.11` (verified on `Python 3.13.14`)
- **Supabase Project** (Auth + PostgreSQL schema)
- **Expo Go** on Android/iOS (for physical mobile testing on the same LAN)

---

## Environment Variables

> **Security Note:** Never commit `.env` files, JWT secrets, or `SUPABASE_SERVICE_ROLE_KEY` values to source control or expose `service_role` credentials to WebApp or MobileApp clients.

### 1. Backend (`WebApp/backend/.env`)
Configure the following variables before running the backend (template keys match `WebApp/.env.example`):

| Variable | Description |
| :--- | :--- |
| `PORT` | Express server listen port (default `5000`) |
| `JWT_SECRET` | Internal JWT signing fallback secret |
| `SUPABASE_URL` | Supabase project URL (`https://<project-ref>.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase project anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** Supabase service-role key (never exposed to clients) |
| `ML_ENGINE_URL` | Optional override for Python FastAPI service (default `http://127.0.0.1:8000`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_EMAIL`, `SMTP_PASSWORD` | Optional SMTP credentials for transactional email triggers |

### 2. MobileApp (`MobileApp/.env`) & EAS Readiness
| Variable | Description |
| :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Express API base URL reachable by your phone over LAN (e.g., `http://<YOUR_PC_LAN_IP>:5000/api`) |

> **Deployment Readiness Note (Pending Render Deployment):** In [MobileApp/eas.json](MobileApp/eas.json), both `preview` and `production` profiles point `EXPO_PUBLIC_API_URL` to `https://cognifyai-web.onrender.com/api` (derived from `cognifyai-web` in `render.yaml`, currently **pending deployment**). After deploying the Render Blueprint, verify the live assigned hostname and update `eas.json` if Render assigns a different subdomain before running an EAS build. The mobile Axios client uses a 65-second default timeout to tolerate Render free-tier cold starts.

---

## Quick Start Guide (Windows PowerShell)

### 1. Install Dependencies

```powershell
# ML Engine (Python)
pip install -r ml_engine/requirements.txt

# WebApp + Backend
npm --prefix WebApp install
npm --prefix WebApp/backend install

# MobileApp
npm --prefix MobileApp install
```

### 2. Provision Admin & Seed Baseline Catalog (Optional / First Setup)
Public signup deliberately blocks `role="admin"` (HTTP `403`). Provision admin accounts securely from CLI:

```powershell
npx --prefix WebApp tsx WebApp/backend/src/scripts/provision_admin.ts <ADMIN_EMAIL> <ADMIN_PASSWORD> "System Administrator"

# Optionally seed baseline jobs and courses into Supabase:
npm --prefix WebApp run seed
```

### 3. Run in Development Mode (All 4 Runtimes)

Open separate terminals from `c:\Users\DELL\cogni_ai`:

**Terminal 1 — Python FastAPI ML Engine (`:8000`)**:
```powershell
cd ml_engine\src
python inference_service.py
```

**Terminal 2 — WebApp Vite Dev Server (`:5173`) + Unified Express API (`0.0.0.0:5000`)**:
```powershell
npm --prefix WebApp run dev
```
- Access WebApp directly via Vite at `http://localhost:5173` or via Express proxy at `http://localhost:5000`.

**Terminal 3 — MobileApp (Expo Go on LAN)**:
```powershell
cd MobileApp
npx expo start --lan -c
```
Scan the QR code in Expo Go on your physical device (ensure both PC and phone share the same Wi-Fi/LAN subnet matching `MobileApp/.env`).

---

## Production Build & Startup

To compile the frontend SSR/SPA bundle and backend ESM output, and launch the unified production server on port `5000`:

```powershell
# 1. Compile Vite client/SSR build + post-build copy + backend TypeScript compilation
npm --prefix WebApp run build

# 2. Terminal 1: Start FastAPI ML service
python ml_engine/src/inference_service.py

# 3. Terminal 2: Start compiled production Express server (serves SPA + REST API)
$env:NODE_ENV="production"
node WebApp/backend/dist/server.js
```

Verify subsystem health:
- `GET http://127.0.0.1:8000/health` — FastAPI ML models readiness
- `GET http://127.0.0.1:5000/api/health` — Express API + network binding status

---

## Machine Learning Engine Overview (`ml_engine/`)

Trained on a deduplicated corpus of **114 developer resumes** across **8 engineering roles** and **9 benchmark job descriptions**, with genuine evaluation artifacts stored in `ml_engine/reports/`:

| Pipeline | Architecture | Verified Performance Metrics |
| :--- | :--- | :--- |
| **Model 1 (`ats_scorer.joblib`)** | Hybrid TF-IDF (`5,000` 1–2 n-grams, sublinear TF) + RapidFuzz Canonical Skill Taxonomy + Section Completeness (`50%` skills / `35%` cosine / `15%` sections) | Mean in-domain cosine similarity **`0.0661`** vs. cross-domain **`0.0249`** (`2.65×` domain separation; note `Full Stack Developer` exhibits `-0.003` overlap margin across general stacks) |
| **Model 2 (`career_classifier.joblib`)** | `FeatureUnion` (TF-IDF on resume text + canonical skill tokens) + **`GradientBoosting`** multiclass classifier | Stratified 4-Fold CV accuracy **`73.8% ± 5.4%`** (`0.7023` weighted F1, `0.6919` macro F1), beating RandomForest (`65.9%`) and LogisticRegression (`63.2%`). *Note: 20% holdout (`n=23`) reached `100%`, though 3 rare roles had `support=1`.* |

Both models power Web and Mobile equally via Express integration (`resume/upload`, `ai/resume-optimize`, `ai/career-paths`, `ai/career-prediction`, `ai/career-twin`, `ai/company-readiness`, `jobs/recommend`, `jobs/salary-insights`, `recruiter/candidates`). If FastAPI is stopped, `mlService.ts` degrades cleanly to a deterministic keyword fallback marked `"source": "fallback"`.

---

## Role-Based Access Control (RBAC)

- **Student / Job Seeker (`user`)**: Dashboard, resume upload/history & comparison, ML ATS & Career Twin analysis, jobs discovery/save/apply, courses & lesson completion, notifications, AI mock interview & skill assessments, profile & subscription tier settings.
- **Organization / Recruiter (`organization` / `recruiter`)**: Isolated talent pool strictly querying `role='user'` profiles, ML role-matched candidate ranking (`GET /api/recruiter/candidates?role=...`), and candidate shortlist persistence.
- **Administrator (`admin`)**: Live Supabase DB metrics, system subsystem health checks (`database`, `backend`, `mlEngine`), user management/deletion, resume oversight, and live JSON platform report exports. Public signup rejects `role="admin"` with HTTP `403`, and backend middleware resolves admin privileges strictly from the PostgreSQL `profiles` table rather than client metadata.

---

## Verification & Quality Checks

| Check Suite | Command | Scope |
| :--- | :--- | :--- |
| **Python ML Unit Suite** | `python ml_engine/tests/test_ml_engine.py` | 15 tests: PDF/text preprocessing, corrupt/empty guards, skill taxonomy extraction, ATS discrimination, career classification, candidate ranking |
| **TypeScript Static Checks** | `npx --prefix WebApp tsc -p WebApp/tsconfig.json --noEmit`<br>`npx --prefix MobileApp tsc -p MobileApp/tsconfig.json --noEmit`<br>`npm --prefix WebApp/backend run build` | Zero compiler/type errors across WebApp, MobileApp, and Express backend |
| **Full Live E2E & Security Suite** | `tsx WebApp/backend/src/scripts/verify_phase6.ts` | 33 automated checks across compiled production server (`:5000`), FastAPI (`:8000`), and live Supabase DB (Auth, RBAC, Multer file guards, ML ATS/Career, cross-platform sync, notification `is_read` persistence, recruiter ML ranking, teardown cleanup) |

---

## Scope Notes & Transparent Simulations

1. **Billing / Subscriptions (`POST /api/subscriptions/upgrade`)**: Plan switches persist in the Supabase `subscriptions` table (`Free`, `Pro`, `Enterprise`) without external payment card gateways (Stripe/Razorpay).
2. **AI Chat & Lesson Playback**: `/api/ai/chat` returns a static integration notice when no external LLM provider key is configured. Web course lessons simulate playback timing (`lesson.$lessonId.tsx`) while reading/persisting genuine completion state in Supabase (`user_courses`).
3. **Mock Interview Scoring (`/api/ai/interview/evaluate`)**: Evaluates answers using a deterministic STAR/depth rubric rather than an external generative LLM or WebRTC video stream.
