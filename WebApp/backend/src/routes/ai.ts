import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import multer from "multer";
import { supabaseAdmin } from "../config/supabase";
import { 
  generateCareerDNA, 
  generateCompanyReadiness, 
  generateCareerTwin,
  generateLearningRoadmap,
  generateInterviewQuestions,
  evaluateInterviewAnswers,
  parseResumeAlgorithm,
  generateCareerForecasting
} from "../utils/aiGenerator";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// 3. INDUSTRY DEMAND
router.get("/industry-demand", async (req, res) => {
  return res.json({
    categories: [
      { name: "Software Engineering", growth: 12, openings: 15000, salary: 120000, trend: "up" },
      { name: "Data Science", growth: 25, openings: 8000, salary: 140000, trend: "up" }
    ],
    marketDrivers: ["AI Adoption", "Cloud Migration"]
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
    return res.json(data);
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

// 6. CAREER PATHS
router.get("/career-paths", authMiddleware, async (req: AuthRequest, res: Response) => {
  return res.json([
    { role: "Senior Frontend Developer", matchPercentage: 92, salaryRange: "$110k - $150k", requiredSkills: ["React", "TypeScript", "System Design"], missingSkills: ["System Design"], learningRoadmap: ["Take System Design course"] },
    { role: "Full Stack Engineer", matchPercentage: 85, salaryRange: "$120k - $160k", requiredSkills: ["Node.js", "React", "PostgreSQL"], missingSkills: ["PostgreSQL"], learningRoadmap: ["Learn SQL basics"] }
  ]);
});

// 7. RESUME OPTIMIZE
router.post("/resume-optimize", authMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    let text = req.body.resumeText || "";
    if (req.file) {
      const parsed = await pdf(req.file.buffer);
      text = parsed.text;
    }
    
    const targetJob = req.body.targetJob || "Software Engineer";
    const result = parseResumeAlgorithm(text, targetJob);
    
    // Save Resume
    const { data: resume } = await supabaseAdmin.from("resumes").insert({
      user_id: userId,
      file_name: req.file ? req.file.originalname : "pasted_resume.txt",
      file_url: "local://memory",
      ats_score: result.score,
      parsed_text: text,
      skills: result.extractedSkills
    }).select().single();
    
    // Save ATS Report
    await supabaseAdmin.from("ats_reports").insert({
      user_id: userId,
      score: result.score,
      strengths: result.keywordMatch.filter((k: any) => k.status === "found").map((k: any) => k.word),
      weaknesses: result.keywordMatch.filter((k: any) => k.status === "missing").map((k: any) => k.word),
      recommendations: result.improvements
    });
    
    // Auto-update Profile missing skills logic could go here
    
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/ats-reports/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabaseAdmin.from("ats_reports").select("*").eq("user_id", req.user?.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return res.status(404).json({ message: "No report found." });
    return res.json(data);
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

// 11. COMPANY READINESS
router.post("/company-readiness", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, targetRole } = req.body;
    const userId = req.user?.id!;
    const resumeText = await getLatestResume(userId);
    
    const analysis = generateCompanyReadiness(companyName, targetRole, resumeText);
    const { data } = await supabaseAdmin.from("company_readiness").insert({ user_id: userId, ...analysis }).select().single();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/company-readiness/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabaseAdmin.from("company_readiness").select("*").eq("user_id", req.user?.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// 12. CAREER TWIN
router.post("/career-twin", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const resumeText = await getLatestResume(userId);
    const twin = generateCareerTwin(userId, resumeText);
    
    const { data } = await supabaseAdmin.from("career_twin").insert({ user_id: userId, ...twin }).select().single();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.get("/career-twin/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = await supabaseAdmin.from("career_twin").select("*").eq("user_id", req.user?.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return res.json(data);
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
    
    const { data } = await supabaseAdmin.from("ai_interviews").insert({ user_id: userId, company, role, questions }).select().single();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

router.post("/interview/evaluate", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, answers } = req.body;
    const evaluation = evaluateInterviewAnswers(answers);
    
    await supabaseAdmin.from("ai_interviews").update({ score: evaluation.score, feedback: evaluation.feedback, completed: true }).eq("id", sessionId);
    return res.json(evaluation);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;
