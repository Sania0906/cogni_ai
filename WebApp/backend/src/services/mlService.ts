/**
 * CognifyAI Backend - Machine Learning Integration Service
 * Connects Express backend to the Python ML Engine (FastAPI) over private/local network.
 * Provides ATS Resume Scoring, Career Trajectory Prediction, and Candidate Ranking.
 */

const ML_PROD_ENV_KEYS = ["APP_ENV", "ENVIRONMENT", "ENV", "NODE_ENV"] as const;
const ML_PROD_ENV_VALUES = new Set(["production", "prod"]);
const ML_TRUTHY_FLAGS = new Set(["true", "1", "yes"]);

/**
 * Mirrors FastAPI `is_production_environment()` so Express fails closed under identical runtime flags.
 */
export function isMlProductionEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  for (const key of ML_PROD_ENV_KEYS) {
    const val = (env[key] || "").trim().toLowerCase();
    if (ML_PROD_ENV_VALUES.has(val)) {
      return true;
    }
  }
  if (ML_TRUTHY_FLAGS.has((env.RENDER || "").trim().toLowerCase())) {
    return true;
  }
  if (ML_TRUTHY_FLAGS.has((env.ML_REQUIRE_SECRET || "").trim().toLowerCase())) {
    return true;
  }
  return false;
}

function normalizeServiceUrl(rawUrl?: string): string {
  const trimmed = (rawUrl || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "http://127.0.0.1:8000";
  // Render fromService hostport provides "service:port" without a URL scheme
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

export interface ATSResult {
  ats_score: number;
  target_role: string;
  score_breakdown: {
    skill_coverage_score: number;
    semantic_similarity_score: number;
    section_completeness_score: number;
    raw_cosine_similarity: number;
    raw_skill_coverage_pct: number;
    raw_section_completeness_pct: number;
  };
  matched_skills: string[];
  missing_required_skills: string[];
  additional_skills: string[];
  all_extracted_skills: string[];
  sections_detected: Record<string, boolean>;
  actionable_recommendations: string[];
  source?: "ml_engine" | "fallback";
}

export interface CareerPredictionResult {
  predicted_role: string;
  confidence_score: number;
  confidence_percentage: number;
  model_architecture: string;
  alternative_trajectories: Array<{
    role: string;
    probability: number;
    probability_percentage: number;
    suitability: string;
  }>;
  candidate_skills: string[];
  role_readiness: {
    benchmark_role: string;
    readiness_score: number;
    matched_skills: string[];
    missing_critical_skills: string[];
  };
  career_transition_advice: string[];
  source?: "ml_engine" | "fallback";
}

export interface CandidateRankItem {
  candidate_id: string;
  name: string;
  ats_score: number;
  score_breakdown: any;
  matched_skills: string[];
  missing_skills: string[];
  all_extracted_skills: string[];
}

export interface ScoreCandidatesResult {
  total_evaluated: number;
  target_role: string;
  ranked_candidates: CandidateRankItem[];
  source?: "ml_engine" | "fallback";
}

export class MLService {
  private static instance: MLService;
  private isOnline: boolean | null = null;
  private lastHealthCheck: number = 0;

  private constructor() {}

  public static getInstance(): MLService {
    if (!MLService.instance) {
      MLService.instance = new MLService();
    }
    return MLService.instance;
  }

  private hasWarnedMissingSecret: boolean = false;

  private isProductionRuntime(): boolean {
    return isMlProductionEnvironment(process.env);
  }

  private hasValidProductionAuth(): boolean {
    const secret = process.env.ML_SERVICE_SECRET?.trim();
    if (!secret && this.isProductionRuntime()) {
      if (!this.hasWarnedMissingSecret) {
        this.hasWarnedMissingSecret = true;
        console.error(
          "[MLService] Security error: ML_SERVICE_SECRET is missing or empty in production; failing closed to fallback."
        );
      }
      return false;
    }
    return true;
  }

  private getBaseUrl(): string {
    return normalizeServiceUrl(process.env.ML_SERVICE_URL || process.env.ML_ENGINE_URL);
  }

  private getServiceHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const secret = process.env.ML_SERVICE_SECRET?.trim();
    return {
      ...extra,
      ...(secret ? { "X-ML-Service-Secret": secret } : {}),
    };
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<globalThis.Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Health check to detect if Python ML engine is active and models are loaded.
   */
  public async checkHealth(force: boolean = false): Promise<boolean> {
    if (!this.hasValidProductionAuth()) {
      this.isOnline = false;
      this.lastHealthCheck = Date.now();
      return false;
    }

    const now = Date.now();
    // Cache positive health status for 5 seconds, don't cache failure if forced
    if (!force && this.isOnline === true && now - this.lastHealthCheck < 5000) {
      return this.isOnline;
    }

    try {
      const res = await this.fetchWithTimeout(
        `${this.getBaseUrl()}/health`,
        { headers: this.getServiceHeaders() },
        2000
      );

      let ready = res.ok;
      if (res.ok) {
        try {
          const data: any = await res.json();
          if (typeof data?.ready === "boolean") {
            ready = data.ready;
          } else if (data?.models_loaded) {
            ready = Boolean(
              data.models_loaded.ats_scorer && data.models_loaded.career_classifier
            );
          }
        } catch {
          // Keep res.ok if health response body is plain text
        }
      }

      this.isOnline = ready;
      this.lastHealthCheck = now;
      return ready;
    } catch {
      this.isOnline = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /**
   * Evaluates resume using the genuine ML ATS Scorer pipeline (TF-IDF + Cosine + Skills).
   */
  public async predictATS(
    resumeText: string,
    jobDescription?: string,
    targetRole?: string
  ): Promise<ATSResult> {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await this.fetchWithTimeout(
          `${this.getBaseUrl()}/predict/ats`,
          {
            method: "POST",
            headers: this.getServiceHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              resume_text: resumeText,
              job_description: jobDescription || undefined,
              target_role: targetRole || undefined,
            }),
          },
          10000
        );

        if (res.ok) {
          const data = (await res.json()) as ATSResult;
          data.source = "ml_engine";
          return data;
        }
        this.isOnline = false;
      } catch (err) {
        this.isOnline = false;
        console.warn("[MLService] ML engine request failed, falling back:", err);
      }
    }

    // Deterministic rule-based fallback if ML server is offline or unauthenticated
    return this.fallbackATS(resumeText, targetRole || "Full Stack Developer");
  }

  /**
   * Classifies career trajectory using the genuine trained ML pipeline.
   */
  public async predictCareer(resumeText: string): Promise<CareerPredictionResult> {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await this.fetchWithTimeout(
          `${this.getBaseUrl()}/predict/career`,
          {
            method: "POST",
            headers: this.getServiceHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ resume_text: resumeText }),
          },
          10000
        );

        if (res.ok) {
          const data = (await res.json()) as CareerPredictionResult;
          data.source = "ml_engine";
          return data;
        }
        this.isOnline = false;
      } catch (err) {
        this.isOnline = false;
        console.warn("[MLService] ML engine career prediction failed, falling back:", err);
      }
    }

    return this.fallbackCareer(resumeText);
  }

  /**
   * Evaluates and ranks multiple candidate resumes for recruiters.
   */
  public async scoreCandidates(
    candidates: Array<{ id: string; name?: string; resume_text: string }>,
    targetRole?: string,
    jobDescription?: string
  ): Promise<ScoreCandidatesResult> {
    const online = await this.checkHealth();
    if (online) {
      try {
        const res = await this.fetchWithTimeout(
          `${this.getBaseUrl()}/score-candidates`,
          {
            method: "POST",
            headers: this.getServiceHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              candidates,
              target_role: targetRole,
              job_description: jobDescription,
            }),
          },
          15000
        );

        if (res.ok) {
          const data = (await res.json()) as ScoreCandidatesResult;
          data.source = "ml_engine";
          return data;
        }
        this.isOnline = false;
      } catch (err) {
        this.isOnline = false;
        console.warn("[MLService] ML engine score-candidates failed, falling back:", err);
      }
    }

    // Fallback: score individually
    const scored: CandidateRankItem[] = [];
    for (const c of candidates) {
      const ats = await this.predictATS(c.resume_text, jobDescription, targetRole);
      scored.push({
        candidate_id: c.id,
        name: c.name || "Candidate",
        ats_score: ats.ats_score,
        score_breakdown: ats.score_breakdown,
        matched_skills: ats.matched_skills,
        missing_skills: ats.missing_required_skills,
        all_extracted_skills: ats.all_extracted_skills,
      });
    }

    scored.sort((a, b) => b.ats_score - a.ats_score);

    return {
      total_evaluated: scored.length,
      target_role: targetRole || "Software Engineer",
      ranked_candidates: scored,
      source: "fallback",
    };
  }

  /**
   * Deterministic local fallback for ATS calculation when ML engine is starting or offline.
   */
  private fallbackATS(text: string, targetRole: string): ATSResult {
    const t = text.toLowerCase();
    const coreSkills = ["javascript", "typescript", "react", "node.js", "python", "sql", "docker", "aws", "git"];
    const matched = coreSkills.filter((s) => t.includes(s));
    const missing = coreSkills.filter((s) => !t.includes(s));
    const coveragePct = Math.round((matched.length / coreSkills.length) * 100);
    const score = Math.max(30, Math.min(95, Math.round(coveragePct * 0.7 + 25)));

    return {
      ats_score: score,
      target_role: targetRole,
      score_breakdown: {
        skill_coverage_score: Math.round(coveragePct * 0.5),
        semantic_similarity_score: 25.0,
        section_completeness_score: 15.0,
        raw_cosine_similarity: 0.25,
        raw_skill_coverage_pct: coveragePct,
        raw_section_completeness_pct: 75,
      },
      matched_skills: matched.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      missing_required_skills: missing.slice(0, 3).map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      additional_skills: [],
      all_extracted_skills: matched.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
      sections_detected: { summary: true, experience: true, education: true, skills: true },
      actionable_recommendations: [
        `Incorporate core requirements: ${missing.slice(0, 3).join(", ")}.`,
        "Quantify accomplishments with measurable impact metrics.",
      ],
      source: "fallback",
    };
  }

  /**
   * Deterministic local fallback for career prediction.
   */
  private fallbackCareer(text: string): CareerPredictionResult {
    const t = text.toLowerCase();
    let role = "Full Stack Developer";
    let conf = 0.75;

    if (t.includes("data") || t.includes("sql") || t.includes("machine learning")) {
      role = t.includes("machine learning") ? "Data Scientist" : "Data Analyst";
      conf = 0.82;
    } else if (t.includes("devops") || t.includes("cloud") || t.includes("kubernetes")) {
      role = "DevOps Engineer";
      conf = 0.80;
    } else if (t.includes("frontend") || t.includes("css") || t.includes("react")) {
      role = "Frontend Developer";
      conf = 0.78;
    }

    return {
      predicted_role: role,
      confidence_score: conf,
      confidence_percentage: conf * 100,
      model_architecture: "Local Rule Heuristic Fallback",
      alternative_trajectories: [
        { role: "Full Stack Developer", probability: 0.15, probability_percentage: 15, suitability: "Moderate" },
        { role: "Cloud Engineer", probability: 0.10, probability_percentage: 10, suitability: "Potential" },
      ],
      candidate_skills: ["JavaScript", "TypeScript", "SQL"],
      role_readiness: {
        benchmark_role: role,
        readiness_score: 75.0,
        matched_skills: ["JavaScript", "TypeScript"],
        missing_critical_skills: ["Docker", "Kubernetes"],
      },
      career_transition_advice: [`Deepen competency in modern architectures for ${role}.`],
      source: "fallback",
    };
  }
}

export const mlService = MLService.getInstance();
