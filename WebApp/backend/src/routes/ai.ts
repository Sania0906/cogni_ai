import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import { mlService } from "../services/mlService.js";
import { 
  generateCareerDNA, 
  generateCompanyReadiness, 
  generateCareerTwin,
  generateLearningRoadmap,
  generateInterviewQuestions,
  evaluateInterviewAnswers,
  parseResumeAlgorithm,
  generateCareerForecasting
} from "../utils/aiGenerator.js";
import {
  resumeUploadMiddleware,
  extractTextFromUploadedResume,
  uploadResumeToStorage,
} from "../utils/resumeHelper.js";

const router = Router();

// Helper to get latest resume text
async function getLatestResume(userId: string) {
  const { data } = await supabaseAdmin.from("resumes").select("*").eq("user_id", userId).order("upload_date", { ascending: false }).limit(1).maybeSingle();
  return data ? data.parsed_text : "Default fallback resume text with standard skills like JavaScript, React, Node.js.";
}

// 1. AI CAREER DNA
router.get("/career-dna", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const resumeText = await getLatestResume(userId);
    
    const { data: existing } = await supabaseAdmin.from("career_dna").select("*").eq("user_id", userId).maybeSingle();
    if (existing) return res.json(existing);
    
    const dna = generateCareerDNA(userId, resumeText);
    const { data } = await supabaseAdmin.from("career_dna").insert({ user_id: userId, ...dna }).select().single();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 2. CAREER SUCCESS
router.get("/career-success", authMiddleware, async (req: AuthRequest, res: Response) => {
  return res.json({
    targetRole: "Senior Engineer",
    probabilityScore: 82,
    breakdown: [
      { name: "Skills Match", rating: 85, detail: "Strong core competencies." },
      { name: "Experience Level", rating: 75, detail: "Approaching required years." }
    ],
    growthOutlook: "Positive",
    alternativeRoles: [{ role: "Engineering Manager", prob: 65 }]
  });
});

// 3. INDUSTRY DEMAND (Database-Backed from market_insights with curated baseline fallback)
router.get("/industry-demand", async (_req, res) => {
  try {
    const { data: insights, error } = await supabaseAdmin
      .from("market_insights")
      .select("*")
      .order("growth_rate", { ascending: false });

    if (error) {
      console.warn("[IndustryDemand] Supabase query warning:", error.message);
    }

    if (insights && insights.length > 0) {
      const drivers = Array.from(
        new Set(
          insights.flatMap((row: any) =>
            Array.isArray(row.market_drivers) ? row.market_drivers : []
          )
        )
      ).slice(0, 6);

      return res.json({
        categories: insights.map((row: any) => ({
          name: row.category || row.name || row.domain || row.role || "Software Engineering",
          growth: Number(row.growth_rate ?? row.growth ?? row.demand_growth ?? 12),
          openings: Number(row.openings_count ?? row.openings ?? row.job_count ?? 1000),
          salary: Number(row.average_salary ?? row.salary ?? row.avg_salary ?? 120000),
          trend: Number(row.growth_rate ?? row.growth ?? 12) >= 0 ? "up" : "down",
        })),
        marketDrivers:
          drivers.length > 0
            ? drivers
            : ["AI & ML Engineering Adoption", "Cloud-Native Infrastructure", "Data & Analytics Engineering"],
        source: "database",
      });
    }
  } catch (err: any) {
    console.warn("[IndustryDemand] Query fallback:", err?.message);
  }

  return res.json({
    categories: [
      { name: "Software Engineering", growth: 12, openings: 15000, salary: 120000, trend: "up" },
      { name: "Data Science & AI", growth: 25, openings: 8000, salary: 140000, trend: "up" },
    ],
    marketDrivers: ["AI Adoption", "Cloud Migration"],
    source: "benchmark",
  });
});

// 4. ROADMAP GENERATE
router.post("/roadmap/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company, role } = req.body;
    const userId = req.user?.id!;
    const resumeText = await getLatestResume(userId);
    const roadmap = generateLearningRoadmap(role, company, resumeText);
    
    const { data } = await supabaseAdmin.from("learning_roadmaps").insert({
      user_id: userId,
      goal: roadmap.goal,
      nodes: roadmap.nodes
    }).select().single();
    
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/roadmap/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabaseAdmin.from("learning_roadmaps").select("*").eq("user_id", req.user?.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return res.status(404).json({ message: "No roadmap found." });

    const nodes = data.nodes || [];
    const milestones = nodes.map((n: any, idx: number) => ({
      id: n.id || String(idx + 1),
      title: n.label || n.title || `Phase ${idx + 1}`,
      description: n.description || "",
      status: n.status || "locked",
      completed: n.status === "completed"
    }));

    return res.json({
      ...data,
      title: data.title || data.goal || "Learning Roadmap",
      milestones
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/roadmap/milestone/:milestoneId/status", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { status, roadmapId } = req.body;
  try {
    const { data: roadmap } = await supabaseAdmin.from("learning_roadmaps").select("*").eq("id", roadmapId).single();
    const updatedNodes = roadmap.nodes.map((n: any) => n.id === req.params.milestoneId ? { ...n, status } : n);
    await supabaseAdmin.from("learning_roadmaps").update({ nodes: updatedNodes }).eq("id", roadmapId);
    return res.json({ message: "Updated" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 5. EMPLOYABILITY
router.get("/employability", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { data: ats } = await supabaseAdmin.from("ats_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const score = ats?.score || 60;
    
    return res.json({
      overallScore: score,
      components: [
        { label: "Technical Skills", score: score + 5, status: "Good" },
        { label: "Resume Formatting", score: score - 2, status: "Average" }
      ],
      feedback: ["Add more quantifiable metrics."]
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 6. CAREER PATHS (ML-Powered)
router.get("/career-paths", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const resumeText = await getLatestResume(userId);
    const prediction = await mlService.predictCareer(resumeText);

    const paths = [
      {
        role: prediction.predicted_role,
        matchPercentage: Math.round(prediction.role_readiness.readiness_score),
        salaryRange: "$110k - $160k",
        requiredSkills: [...prediction.role_readiness.matched_skills, ...prediction.role_readiness.missing_critical_skills],
        missingSkills: prediction.role_readiness.missing_critical_skills,
        confidence: prediction.confidence_percentage,
        learningRoadmap: prediction.career_transition_advice,
      },
      ...prediction.alternative_trajectories.slice(0, 3).map((alt) => ({
        role: alt.role,
        matchPercentage: Math.round(alt.probability_percentage),
        salaryRange: "$100k - $145k",
        requiredSkills: prediction.candidate_skills.slice(0, 4),
        missingSkills: ["System Design", "Cloud Infrastructure"],
        confidence: alt.probability_percentage,
        learningRoadmap: [`Explore transition requirements for ${alt.role}`],
      })),
    ];

    return res.json(paths);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 6B. CAREER PREDICTION (Direct ML Endpoint)
router.post("/career-prediction", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    let text = req.body?.resumeText;
    if (!text || text.trim().length === 0) {
      text = await getLatestResume(userId);
    }
    const result = await mlService.predictCareer(text);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 7. RESUME OPTIMIZE (ML-Powered ATS Evaluation)
router.post("/resume-optimize", authMiddleware, resumeUploadMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { text, fileName } = await extractTextFromUploadedResume(
      req.file,
      req.body.resumeText || ""
    );

    if (!text || text.trim().length < 15) {
      return res.status(400).json({
        message: "The uploaded document is empty, corrupted, or contains insufficient readable text (minimum 15 characters).",
      });
    }

    const targetJob = req.body.targetJob || "Software Engineer";
    const [result, storageResult] = await Promise.all([
      mlService.predictATS(text, undefined, targetJob),
      uploadResumeToStorage(userId, req.file),
    ]);
    const detectedSkills = result.all_extracted_skills || result.matched_skills;
    const missingSkills = result.missing_required_skills;

    const roundedScore = Math.round(result.ats_score);

    // Save Resume
    try {
      await supabaseAdmin.from("resumes").upsert({
        user_id: userId,
        file_name: fileName,
        file_url: storageResult.fileUrl,
        ats_score: roundedScore,
        parsed_text: text,
        skills: detectedSkills,
        improvements: result.actionable_recommendations || [],
        upload_date: new Date().toISOString(),
      }, { onConflict: "user_id" });
    } catch (err: any) {
      console.warn("resumes insert warning:", err?.message);
    }

    // Save ATS Report using exact live Supabase schema columns
    try {
      await supabaseAdmin.from("ats_reports").insert({
        user_id: userId,
        score: roundedScore,
        strengths: detectedSkills.slice(0, 8),
        weaknesses: missingSkills.slice(0, 8),
        recommendations: (result.actionable_recommendations || []).slice(0, 8),
        missing_keywords: missingSkills.slice(0, 10),
        extracted_skills: detectedSkills.slice(0, 15),
        resume_url: fileName,
      });
    } catch (err: any) {
      console.warn("ats_reports insert warning:", err?.message);
    }

    return res.json({
      score: result.ats_score,
      ats_score: result.ats_score,
      file_url: storageResult.fileUrl,
      storage_path: storageResult.storagePath,
      storage_persisted: storageResult.persisted,
      score_breakdown: result.score_breakdown,
      detected_skills: detectedSkills,
      skills: detectedSkills,
      missing_skills: missingSkills,
      recommendations: result.actionable_recommendations,
      improvements: result.actionable_recommendations,
      target_role: result.target_role,
      source: result.source || "ml_engine",
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/ats-reports/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabaseAdmin.from("ats_reports").select("*").eq("user_id", req.user?.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) return res.json(data);

    const { data: resume } = await supabaseAdmin.from("resumes").select("*").eq("user_id", req.user?.id).order("upload_date", { ascending: false }).limit(1).maybeSingle();
    if (resume) {
      return res.json({
        id: resume.id,
        user_id: resume.user_id,
        score: resume.ats_score,
        strengths: resume.skills || [],
        weaknesses: [],
        recommendations: resume.improvements || ["Quantify achievements with metrics", "Highlight core domain skills"],
        created_at: resume.upload_date || resume.created_at
      });
    }

    return res.status(404).json({ message: "No report found." });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});


// 8. FORECASTING
router.get("/career-forecasting", authMiddleware, async (req: AuthRequest, res: Response) => {
  const resumeText = await getLatestResume(req.user?.id!);
  return res.json(generateCareerForecasting(resumeText));
});

// 9. CHAT
router.post("/chat", authMiddleware, async (req: AuthRequest, res: Response) => {
  return res.json({ reply: "I am CognifyAI. This feature requires an active LLM integration, but I can tell you that your profile looks great based on your current inputs!" });
});

// 10. RESUMES HISTORY & COMPARE
router.get("/resumes/history", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabaseAdmin.from("resumes").select("*").eq("user_id", req.user?.id).order("upload_date", { ascending: false });
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/resumes/compare", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabaseAdmin.from("resumes").select("*").eq("user_id", req.user?.id).order("upload_date", { ascending: false }).limit(2);
    if (!data || data.length < 2) return res.json({ canCompare: false, message: "Upload at least two resumes to compare." });
    
    const latest = data[0];
    const prev = data[1];
    
    const prevSkills = new Set(prev.skills || []);
    const currSkills = new Set(latest.skills || []);
    
    return res.json({
      canCompare: true,
      latestVersionDate: latest.upload_date,
      previousVersionDate: prev.upload_date,
      latestScore: latest.ats_score,
      previousScore: prev.ats_score,
      atsImprovement: latest.ats_score - prev.ats_score,
      addedSkills: [...currSkills].filter(x => !prevSkills.has(x)),
      removedSkills: [...prevSkills].filter(x => !currSkills.has(x)),
      newProjects: [],
      newCertifications: []
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/resumes/restore/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabaseAdmin.from("resumes").select("*").eq("id", req.params.id).eq("user_id", req.user?.id).single();
    if (!data) throw new Error("Resume not found");
    
    await supabaseAdmin.from("resumes").insert({
      user_id: req.user?.id,
      file_name: data.file_name + " (Restored)",
      file_url: data.file_url,
      ats_score: data.ats_score,
      parsed_text: data.parsed_text,
      skills: data.skills
    });
    return res.json({ message: "Restored successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 11. COMPANY READINESS (ML-Powered)
router.post("/company-readiness", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, targetRole } = req.body;
    const userId = req.user?.id!;
    const resumeText = await getLatestResume(userId);
    
    const target = targetRole || "Software Engineer";
    const atsResult = await mlService.predictATS(resumeText, undefined, target);
    const readinessScore = atsResult.ats_score;

    const analysis = {
      company_name: companyName || "Target Company",
      companyName: companyName || "Target Company",
      target_role: target,
      targetRole: target,
      readiness_score: readinessScore,
      readinessScore: readinessScore,
      summary: `Based on ML evaluation against benchmark requirements, you are ${readinessScore}% ready for the ${target} role at ${companyName || "your target company"}.`,
      cultural_fit: Math.min(95, Math.max(60, Math.round(readinessScore * 0.95))),
      culturalFit: Math.min(95, Math.max(60, Math.round(readinessScore * 0.95))),
      technical_fit: Math.round(atsResult.score_breakdown.raw_skill_coverage_pct),
      technicalFit: Math.round(atsResult.score_breakdown.raw_skill_coverage_pct),
      gaps: atsResult.missing_required_skills.length > 0 ? atsResult.missing_required_skills : ["System Design", "Cloud Infrastructure Scaling"],
      recommendations: atsResult.actionable_recommendations,
      matched_skills: atsResult.matched_skills,
      source: atsResult.source || "ml_engine",
    };
    
    // Persist to database (ai_insights table)
    try {
      await supabaseAdmin.from("ai_insights").insert({
        user_id: userId,
        category: "company_readiness",
        insight: JSON.stringify(analysis)
      });
    } catch (dbErr: any) {
      console.warn("ai_insights company_readiness insert warning:", dbErr?.message);
    }

    return res.json(analysis);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/company-readiness/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { data } = await supabaseAdmin
      .from("ai_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("category", "company_readiness")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.insight) {
      try {
        const parsed = JSON.parse(data.insight);
        return res.json({
          ...parsed,
          companyName: parsed.company_name || parsed.companyName,
          targetRole: parsed.target_role || parsed.targetRole,
          readinessScore: parsed.readiness_score || parsed.readinessScore,
          summary: parsed.summary || `Based on your profile, you are ${parsed.readiness_score || 85}% ready.`
        });
      } catch (parseErr) {
        // Fallback to generation
      }
    }

    // If none found in DB yet, dynamically generate and persist
    const resumeText = await getLatestResume(userId);
    const analysis = generateCompanyReadiness("Google", "Senior Software Engineer", resumeText);
    await supabaseAdmin.from("ai_insights").insert({
      user_id: userId,
      category: "company_readiness",
      insight: JSON.stringify(analysis)
    });

    return res.json(analysis);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 12. CAREER TWIN (ML-Powered)
router.post("/career-twin", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const resumeText = await getLatestResume(userId);
    const prediction = await mlService.predictCareer(resumeText);

    const roleArchetypeMap: Record<string, { archetype: string; tagline: string; env: string[] }> = {
      "Data Scientist": { archetype: "Ada Lovelace - Analytical Pioneer", tagline: "Insight & Exploration", env: ["AI Research Labs", "FinTech", "Big Data"] },
      "Machine Learning Engineer": { archetype: "Alan Turing - Algorithmic Architect", tagline: "Systemic Intelligence", env: ["AI Startups", "DeepTech", "Autonomous Systems"] },
      "Full Stack Developer": { archetype: "Steve Wozniak - Master Builder", tagline: "Versatile & Practical", env: ["Scaleups", "SaaS Enterprise", "High-Growth Tech"] },
      "Frontend Developer": { archetype: "Jony Ive - Design Artisan", tagline: "Experience & Precision", env: ["Consumer Apps", "Digital Products", "Creative Studios"] },
      "DevOps Engineer": { archetype: "Linus Torvalds - Infrastructure Architect", tagline: "Reliability & Automation", env: ["Cloud Platforms", "Enterprise DevOps", "Site Reliability"] },
      "Cloud Engineer": { archetype: "Werner Vogels - Cloud Visionary", tagline: "Scale & Architecture", env: ["Multi-Cloud Enterprise", "FinTech", "Distributed Systems"] },
      "Data Analyst": { archetype: "Florence Nightingale - Data Communicator", tagline: "Actionable Intelligence", env: ["Business Intelligence", "Consulting", "Strategy"] },
      "Python Developer": { archetype: "Guido van Rossum - Pragmatic Engineer", tagline: "Elegance & Efficiency", env: ["Backend Services", "Scientific Computing", "Automation"] },
    };

    const mappedArchetype = roleArchetypeMap[prediction.predicted_role] || {
      archetype: "The Architect - System Pioneer",
      tagline: "Structural & Logical",
      env: ["Enterprise Tech", "Distributed Systems"]
    };

    const desc = `Your machine-learning profile classification aligns strongly with ${mappedArchetype.archetype} (${prediction.confidence_percentage}% affinity to ${prediction.predicted_role}).`;
    const twin = {
      archetype: mappedArchetype.archetype,
      personality: mappedArchetype.archetype,
      summary: desc,
      description: desc,
      predicted_role: prediction.predicted_role,
      confidence_percentage: prediction.confidence_percentage,
      strengths: prediction.candidate_skills.slice(0, 5),
      weaknesses: prediction.role_readiness.missing_critical_skills,
      recommended_roles: [prediction.predicted_role, ...prediction.alternative_trajectories.map(a => a.role)],
      career_advice: prediction.career_transition_advice,
      source: prediction.source || "ml_engine",
    };
    
    // Persist to database (ai_insights table)
    try {
      await supabaseAdmin.from("ai_insights").insert({
        user_id: userId,
        category: "career_twin",
        insight: JSON.stringify(twin)
      });
    } catch (dbErr: any) {
      console.warn("ai_insights career_twin insert warning:", dbErr?.message);
    }

    return res.json(twin);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/career-twin/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { data } = await supabaseAdmin
      .from("ai_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("category", "career_twin")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data?.insight) {
      try {
        const parsed = JSON.parse(data.insight);
        return res.json({
          ...parsed,
          archetype: parsed.archetype || parsed.personality || "Senior AI Architect Twin",
          summary: parsed.summary || parsed.description || "Optimized for technical leadership & cloud-native systems."
        });
      } catch (parseErr) {
        // Fallback to generation
      }
    }

    // If none found in DB yet, generate and persist
    const resumeText = await getLatestResume(userId);
    const twin = generateCareerTwin(userId, resumeText);
    await supabaseAdmin.from("ai_insights").insert({
      user_id: userId,
      category: "career_twin",
      insight: JSON.stringify(twin)
    });

    return res.json(twin);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 13. AI INTERVIEW
router.post("/interview/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company, role } = req.body;
    const userId = req.user?.id!;
    const resumeText = await getLatestResume(userId);
    const questions = generateInterviewQuestions(company, role, resumeText);
    
    const interviewData = {
      id: "int_" + Date.now(),
      user_id: userId,
      company,
      role,
      questions,
      completed: false
    };

    try {
      await supabaseAdmin.from("ai_insights").insert({
        user_id: userId,
        category: "ai_interview",
        insight: JSON.stringify(interviewData)
      });
    } catch (dbErr: any) {
      console.warn("ai_insights ai_interview insert warning:", dbErr?.message);
    }

    return res.json(interviewData);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/interview/evaluate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { sessionId, answers, company, role } = req.body;
    const evaluation = evaluateInterviewAnswers(answers);

    try {
      await supabaseAdmin.from("ai_insights").insert({
        user_id: userId,
        category: "interview_evaluation",
        insight: JSON.stringify({
          sessionId: sessionId || "int_" + Date.now(),
          company: company || "Target Company",
          role: role || "Software Engineer",
          ...evaluation,
          evaluated_at: new Date().toISOString(),
        }),
      });
    } catch (dbErr: any) {
      console.warn("ai_insights interview_evaluation insert warning:", dbErr?.message);
    }

    return res.json(evaluation);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/interview/history", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { data, error } = await supabaseAdmin
      .from("ai_insights")
      .select("*")
      .eq("user_id", userId)
      .in("category", ["interview_evaluation", "ai_interview"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    const history = (data || []).map((row) => {
      try {
        return { id: row.id, category: row.category, created_at: row.created_at, ...JSON.parse(row.insight) };
      } catch {
        return { id: row.id, category: row.category, created_at: row.created_at };
      }
    });

    return res.json(history);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to load interview history" });
  }
});

export default router;
