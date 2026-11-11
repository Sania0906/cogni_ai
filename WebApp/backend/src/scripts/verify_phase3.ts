/**
 * CognifyAI - Phase 3 ML Engine & Integration Automated Verification Script
 * Validates model artifacts, live inference service, Express ML service layer,
 * and Supabase persistence for ATS scoring and career pathing.
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { mlService } from "../services/mlService.js";
import { supabaseAdmin } from "../config/supabase.js";

const ML_ENGINE_DIR = path.resolve(process.cwd(), "ml_engine");
const ATS_MODEL_PATH = path.join(ML_ENGINE_DIR, "models/ats_scorer.joblib");
const CAREER_MODEL_PATH = path.join(ML_ENGINE_DIR, "models/career_classifier.joblib");
const CLEANED_PROFILES_PATH = path.join(ML_ENGINE_DIR, "datasets/processed/career_profiles_cleaned.csv");
const BENCHMARK_JOBS_PATH = path.join(ML_ENGINE_DIR, "datasets/processed/benchmark_job_descriptions.csv");
const INVENTORY_DOC = path.join(ML_ENGINE_DIR, "datasets/DATASET_INVENTORY.md");
const PERFORMANCE_DOC = path.join(ML_ENGINE_DIR, "reports/MODEL_PERFORMANCE.md");

const PYTHON_BIN = "C:\\Users\\DELL\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";

let passed = 0;
let failed = 0;
let mlProcess: ChildProcess | null = null;

function assert(condition: boolean, testName: string, detail: string = "") {
  if (condition) {
    console.log(`[PASS] ${testName} ${detail ? "(" + detail + ")" : ""}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName} - ${detail}`);
    failed++;
  }
}

async function ensureMLEngineRunning(): Promise<boolean> {
  const isOnline = await mlService.checkHealth();
  if (isOnline) {
    console.log("[Setup] Python ML Engine is already active on port 8000.");
    return true;
  }

  console.log("[Setup] Launching Python ML Engine FastAPI server on port 8000...");
  mlProcess = spawn(
    PYTHON_BIN,
    ["-m", "uvicorn", "ml_engine.src.inference_service:app", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: process.cwd(),
      stdio: "pipe",
    }
  );

  mlProcess.stderr?.on("data", (data) => {
    // console.log(`[Uvicorn stderr]: ${data.toString()}`);
  });

  // Poll until healthy or 15s timeout
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch("http://127.0.0.1:8000/health");
      if (res.ok) {
        console.log("[Setup] Python ML Engine is healthy and ready for inference.");
        await mlService.checkHealth(true);
        return true;
      }
    } catch {
      // Waiting
    }
  }

  console.error("[Setup] Timeout waiting for Python ML Engine.");
  return false;
}

async function runPhase3Verification() {
  console.log("==================================================================");
  console.log(" CognifyAI Phase 3 — Real ML Engine & Backend Verification Suite ");
  console.log("==================================================================\n");

  // SECTION 1: Artifact & Provenance Inventory Inspection
  console.log("--- 1. ML Engine Artifacts & Provenance Verification ---");
  assert(fs.existsSync(ATS_MODEL_PATH), "Model 1: ats_scorer.joblib exists", `Path: ${ATS_MODEL_PATH}`);
  assert(fs.existsSync(CAREER_MODEL_PATH), "Model 2: career_classifier.joblib exists", `Path: ${CAREER_MODEL_PATH}`);
  assert(fs.existsSync(CLEANED_PROFILES_PATH), "Cleaned career profiles dataset exists", `Path: ${CLEANED_PROFILES_PATH}`);
  assert(fs.existsSync(BENCHMARK_JOBS_PATH), "Benchmark job descriptions exist", `Path: ${BENCHMARK_JOBS_PATH}`);
  assert(fs.existsSync(INVENTORY_DOC), "Dataset inventory & provenance documentation exists", `Path: ${INVENTORY_DOC}`);
  assert(fs.existsSync(PERFORMANCE_DOC), "Model performance report exists", `Path: ${PERFORMANCE_DOC}`);

  // Ensure ML engine server is running for genuine live inference
  const mlReady = await ensureMLEngineRunning();
  assert(mlReady, "Python ML Engine FastAPI server online (port 8000)");

  // SECTION 2: ATS Resume Analysis via MLService
  console.log("\n--- 2. ATS Resume Analysis Pipeline Verification ---");
  const sampleFullStackResume = `
    Alex Rivers - Senior Full Stack Developer
    alex.rivers@example.com | San Francisco, CA
    
    Professional Summary:
    Versatile software engineer with 5 years of experience building modern web architectures with React, TypeScript, Node.js, Express.js, and PostgreSQL.
    
    Work Experience:
    Lead Engineer at CloudScale (2021 - Present)
    - Architected distributed REST APIs using Node.js, Express.js, and PostgreSQL.
    - Designed interactive client frontends using React, TypeScript, and TailwindCSS.
    - Containerized microservices using Docker and automated CI/CD releases.
    
    Technical Skills:
    React, TypeScript, Node.js, Express.js, PostgreSQL, Docker, Git, REST APIs, HTML5, CSS3, TailwindCSS.
    
    Education:
    Bachelor of Science in Computer Science - University of California
    
    Projects:
    - High-throughput analytics engine with Redis cache and PostgreSQL.
  `;

  const atsResult = await mlService.predictATS(sampleFullStackResume, undefined, "Full Stack Developer");

  assert(
    atsResult.source === "ml_engine",
    "ATS inference executed by genuine Python ML Engine",
    `Source: ${atsResult.source}`
  );

  assert(
    typeof atsResult.ats_score === "number" && atsResult.ats_score >= 0 && atsResult.ats_score <= 100,
    "ATS Score valid range (0-100)",
    `Computed ATS Score: ${atsResult.ats_score}`
  );

  assert(
    atsResult.matched_skills.some((s) => s.toLowerCase() === "react") &&
    atsResult.matched_skills.some((s) => s.toLowerCase() === "typescript") &&
    atsResult.matched_skills.some((s) => s.toLowerCase() === "node.js"),
    "Matched technical skills accurately extracted by canonical taxonomy",
    `Matched: ${atsResult.matched_skills.join(", ")}`
  );

  assert(
    atsResult.score_breakdown &&
    typeof atsResult.score_breakdown.skill_coverage_score === "number" &&
    typeof atsResult.score_breakdown.semantic_similarity_score === "number" &&
    typeof atsResult.score_breakdown.section_completeness_score === "number",
    "Explainable ATS score breakdown components present",
    `Coverage: ${atsResult.score_breakdown.skill_coverage_score}, Sim: ${atsResult.score_breakdown.semantic_similarity_score}, Sec: ${atsResult.score_breakdown.section_completeness_score}`
  );

  assert(
    Array.isArray(atsResult.actionable_recommendations) && atsResult.actionable_recommendations.length > 0,
    "Actionable recommendations generated",
    `Recommendations: ${atsResult.actionable_recommendations[0]}`
  );

  // SECTION 3: Career Trajectory & Role Classification via MLService
  console.log("\n--- 3. Career Trajectory & Role Classifier Verification ---");
  const sampleDataAnalystResume = `
    Morgan Vance - Data Analyst
    Specialist in SQL database querying, PostgreSQL, Python data manipulation with Pandas and NumPy,
    Tableau dashboard visualization, business intelligence metrics, and statistical analysis.
  `;

  const careerResult = await mlService.predictCareer(sampleDataAnalystResume);

  assert(
    careerResult.source === "ml_engine",
    "Career classification executed by genuine Python ML Engine",
    `Source: ${careerResult.source}`
  );

  assert(
    careerResult.predicted_role === "Data Analyst",
    "Primary predicted role matches domain specialization",
    `Predicted: ${careerResult.predicted_role} (Confidence: ${careerResult.confidence_percentage}%)`
  );

  assert(
    typeof careerResult.confidence_score === "number" && careerResult.confidence_score >= 0 && careerResult.confidence_score <= 1,
    "Confidence score is calibrated probability (0-1)",
    `Score: ${careerResult.confidence_score}`
  );

  assert(
    Array.isArray(careerResult.alternative_trajectories) && careerResult.alternative_trajectories.length > 0,
    "Alternative career trajectories ranked",
    `Top Alternative: ${careerResult.alternative_trajectories[0]?.role} (${careerResult.alternative_trajectories[0]?.probability_percentage}%)`
  );

  assert(
    careerResult.role_readiness && typeof careerResult.role_readiness.readiness_score === "number",
    "Role readiness score computed against target benchmark",
    `Readiness: ${careerResult.role_readiness.readiness_score}%`
  );

  // SECTION 4: Recruiter Multi-Candidate Matching
  console.log("\n--- 4. Recruiter Candidate Scoring & Ranking ---");
  const candidatePool = [
    {
      id: "candidate-ml",
      name: "Dr. Sarah Chen",
      resume_text: "Senior Machine Learning Engineer specializing in Python, PyTorch, Scikit-Learn, Pandas, NumPy, Deep Learning, MLOps, and Docker.",
    },
    {
      id: "candidate-frontend",
      name: "Tyler Brooks",
      resume_text: "Frontend Developer experienced in HTML5, CSS3, React, TailwindCSS, Next.js, and JavaScript.",
    },
  ];

  const ranking = await mlService.scoreCandidates(candidatePool, "Data Scientist");

  assert(
    ranking.total_evaluated === 2,
    "Recruiter pool evaluated total count matches input",
    `Evaluated: ${ranking.total_evaluated}`
  );

  assert(
    ranking.ranked_candidates[0].candidate_id === "candidate-ml",
    "Candidate ranking accurately prioritizes in-domain expertise",
    `Rank 1: ${ranking.ranked_candidates[0].name} (Score: ${ranking.ranked_candidates[0].ats_score}) vs Rank 2: ${ranking.ranked_candidates[1].name} (Score: ${ranking.ranked_candidates[1].ats_score})`
  );

  // SECTION 5: Supabase Database Persistence Verification
  console.log("\n--- 5. Supabase Database Persistence Verification ---");
  const { data: profileRow } = await supabaseAdmin.from("profiles").select("id").limit(1).maybeSingle();
  const testUserId = profileRow?.id || "8fca8144-617b-4765-b1ec-3dd49e9ca932";
  const timestamp = Date.now();

  // Test upsert into resumes with real ML ATS score
  const roundedAtsScore = Math.round(atsResult.ats_score);
  const { data: resumeRow, error: resumeErr } = await supabaseAdmin
    .from("resumes")
    .upsert({
      user_id: testUserId,
      file_name: `ml_verified_resume_${timestamp}.txt`,
      file_url: `local://test_uploads/ml_verified_${timestamp}.txt`,
      ats_score: roundedAtsScore,
      parsed_text: sampleFullStackResume.trim(),
      skills: atsResult.matched_skills,
    }, { onConflict: "user_id" })
    .select()
    .single();

  assert(
    !resumeErr && !!resumeRow,
    "Resume persisted with ML ATS score",
    resumeErr ? `Error: ${resumeErr.message}` : `Resume ID: ${resumeRow?.id}, Score: ${resumeRow?.ats_score}`
  );

  // Test insert into ats_reports
  const { data: reportRow, error: reportErr } = await supabaseAdmin
    .from("ats_reports")
    .insert({
      user_id: testUserId,
      score: roundedAtsScore,
      strengths: atsResult.matched_skills,
      weaknesses: atsResult.missing_required_skills,
      recommendations: atsResult.actionable_recommendations,
    })
    .select()
    .single();

  assert(
    !reportErr && !!reportRow,
    "ATS report record persisted",
    reportErr ? `Error: ${reportErr.message}` : `Report ID: ${reportRow?.id}, Score: ${reportRow?.score}`
  );

  // Test insert into ai_insights (company readiness)
  const readinessPayload = {
    company_name: "Google",
    target_role: "Full Stack Developer",
    readiness_score: atsResult.ats_score,
    summary: `ML evaluation indicates ${atsResult.ats_score}% readiness for Full Stack Developer at Google.`,
    matched_skills: atsResult.matched_skills,
    missing_skills: atsResult.missing_required_skills,
  };

  const { data: insightRow, error: insightErr } = await supabaseAdmin
    .from("ai_insights")
    .insert({
      user_id: testUserId,
      category: "company_readiness",
      insight: JSON.stringify(readinessPayload),
    })
    .select()
    .single();

  assert(
    !insightErr && !!insightRow,
    "ML company readiness persisted to ai_insights",
    insightErr ? `Error: ${insightErr.message}` : `Insight ID: ${insightRow?.id}`
  );

  // Cleanup ML Process if spawned
  if (mlProcess) {
    console.log("\n[Cleanup] Stopping spawned Python ML Engine process...");
    mlProcess.kill();
  }

  console.log("\n==================================================================");
  console.log(` Phase 3 Verification Completed: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase3Verification().catch((err) => {
  if (mlProcess) {
    (mlProcess as ChildProcess).kill();
  }
  console.error("Fatal error during Phase 3 verification:", err);
  process.exit(1);
});
