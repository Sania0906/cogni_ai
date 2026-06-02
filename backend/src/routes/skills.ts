import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

// =========================================================================
// HELPER: USER STATE RETRIEVAL
// =========================================================================
async function getUserState(userId: string) {
  let profile: any = null;
  let skills: any[] = [];
  let assessments: any[] = [];
  
  try {
    const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
    profile = p;
    const { data: s } = await supabaseAdmin.from("skills").select("*").eq("user_id", userId);
    skills = s || [];
    const { data: a } = await supabaseAdmin.from("assessments").select("*").eq("user_id", userId);
    assessments = a || [];
  } catch (err) {
    console.error("Error retrieving user state for skills:", err);
  }
  
  return { profile, skills, assessments };
}

// =========================================================================
// GET USER SKILLS
// =========================================================================
router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("skills")
      .select("*")
      .eq("user_id", req.user?.id);

    if (error) throw error;

    return res.json(data || []);
  } catch (err: any) {
    console.error("Supabase Skills Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve skills" });
  }
});

// =========================================================================
// ADD A SKILL
// =========================================================================
router.post("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { name, category, level, progress } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from("skills")
      .insert({
        name,
        category,
        level: level || "Intermediate",
        progress: progress || 0,
        user_id: req.user?.id
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to save skill" });
  }
});

// =========================================================================
// EDIT A SKILL
// =========================================================================
router.put("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { progress, level } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from("skills")
      .update({
        ...(progress !== undefined ? { progress: parseInt(progress) } : {}),
        ...(level !== undefined ? { level } : {}),
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("user_id", req.user?.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to update skill" });
  }
});

// =========================================================================
// DELETE A SKILL
// =========================================================================
router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const { error } = await supabaseAdmin
      .from("skills")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user?.id);

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.json({ message: "Skill deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to delete skill" });
  }
});

// =========================================================================
// SKILL GAP ANALYSIS
// =========================================================================
router.get("/gap", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";
  const { profile, skills, assessments } = await getUserState(userId);

  const interests = profile?.interests || [];
  let targetRole = "Senior Data Scientist";
  let requiredSkills = [
    { name: "Python", required: 90 },
    { name: "Machine Learning", required: 90 },
    { name: "Deep Learning", required: 85 },
    { name: "SQL", required: 80 },
    { name: "TensorFlow", required: 75 },
    { name: "MLOps / Docker", required: 70 },
    { name: "Data Visualization", required: 60 }
  ];

  if (interests.some((i: string) => i.toLowerCase().includes("ai") || i.toLowerCase().includes("ml") || i.toLowerCase().includes("machine"))) {
    targetRole = "AI Engineer";
    requiredSkills = [
      { name: "Python", required: 95 },
      { name: "Deep Learning", required: 90 },
      { name: "PyTorch", required: 85 },
      { name: "MLOps", required: 80 },
      { name: "Cloud APIs", required: 75 }
    ];
  } else if (interests.some((i: string) => i.toLowerCase().includes("web") || i.toLowerCase().includes("stack") || i.toLowerCase().includes("javascript") || i.toLowerCase().includes("react"))) {
    targetRole = "Full Stack Developer";
    requiredSkills = [
      { name: "JavaScript/TypeScript", required: 90 },
      { name: "React", required: 90 },
      { name: "Node.js", required: 85 },
      { name: "SQL/NoSQL Databases", required: 80 },
      { name: "Git/GitHub", required: 75 }
    ];
  } else if (interests.some((i: string) => i.toLowerCase().includes("cloud") || i.toLowerCase().includes("devops"))) {
    targetRole = "Cloud Engineer";
    requiredSkills = [
      { name: "Cloud Platforms (AWS/GCP)", required: 90 },
      { name: "Docker & Kubernetes", required: 85 },
      { name: "Linux Administration", required: 80 },
      { name: "Python/Bash scripting", required: 75 }
    ];
  } else if (interests.some((i: string) => i.toLowerCase().includes("security") || i.toLowerCase().includes("cyber"))) {
    targetRole = "Cybersecurity Analyst";
    requiredSkills = [
      { name: "Network Security", required: 90 },
      { name: "Penetration Testing", required: 85 },
      { name: "Linux Administration", required: 80 },
      { name: "Cryptography", required: 75 }
    ];
  }

  const findUserProficiency = (skillName: string) => {
    const nameLower = skillName.toLowerCase();
    
    // 1. Look in user's skills first
    const matchSkill = skills.find(s => s.name.toLowerCase().includes(nameLower) || nameLower.includes(s.name.toLowerCase()));
    let skillVal = 0;
    if (matchSkill) {
      skillVal = matchSkill.progress || (matchSkill.level === "Advanced" ? 85 : matchSkill.level === "Intermediate" ? 65 : 45);
    }
    
    // 2. Look in assessments
    let assessVal = 0;
    const matchAssess = assessments.find(a => {
      const cat = a.category.toLowerCase();
      if (nameLower.includes("python") || nameLower.includes("scripting") || nameLower.includes("javascript") || nameLower.includes("node") || nameLower.includes("bash") || nameLower.includes("git")) {
        return cat.includes("prog") || cat.includes("web");
      }
      if (nameLower.includes("machine") || nameLower.includes("deep") || nameLower.includes("pytorch") || nameLower.includes("tensorflow") || nameLower.includes("ai")) {
        return cat.includes("ai") || cat.includes("ml");
      }
      if (nameLower.includes("sql") || nameLower.includes("database") || nameLower.includes("nosql")) {
        return cat.includes("db") || cat.includes("data");
      }
      if (nameLower.includes("cloud") || nameLower.includes("docker") || nameLower.includes("kubernetes") || nameLower.includes("devops") || nameLower.includes("platforms")) {
        return cat.includes("cloud") || cat.includes("sys");
      }
      if (nameLower.includes("security") || nameLower.includes("cryptography") || nameLower.includes("penetration")) {
        return cat.includes("security") || cat.includes("aptitude");
      }
      return false;
    });
    if (matchAssess) {
      assessVal = matchAssess.score;
    }
    
    if (skillVal > 0 && assessVal > 0) {
      return Math.round((skillVal + assessVal) / 2);
    }
    if (skillVal > 0) return skillVal;
    if (assessVal > 0) return assessVal;
    
    return profile?.onboarding_completed ? 25 : 15;
  };

  const gapSkills = requiredSkills.map(req => {
    const current = findUserProficiency(req.name);
    const gap = current - req.required;
    const status = gap >= 0 ? "Met" : gap > -20 ? "Needs Improvement" : "Critical Gap";
    return {
      name: req.name,
      current,
      required: req.required,
      gap,
      status
    };
  });

  const totalRequired = requiredSkills.reduce((sum, s) => sum + s.required, 0);
  const totalCurrent = requiredSkills.reduce((sum, s) => sum + findUserProficiency(s.name), 0);
  const matchPercentage = Math.min(99, Math.max(35, Math.round((totalCurrent / totalRequired) * 100)));

  return res.json({
    targetRole,
    matchPercentage,
    skills: gapSkills
  });
});

// =========================================================================
// SKILL GROWTH PREDICTION
// =========================================================================
router.get("/growth", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";
  const { assessments } = await getUserState(userId);

  const avgAssessment = assessments && assessments.length > 0
    ? Math.round(assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length)
    : 70;

  const currentVal = avgAssessment;

  const historical = [
    { month: "Jan", score: Math.round(currentVal * 0.7) },
    { month: "Feb", score: Math.round(currentVal * 0.78) },
    { month: "Mar", score: Math.round(currentVal * 0.85) },
    { month: "Apr", score: Math.round(currentVal * 0.92) },
    { month: "May", score: currentVal },
  ];

  const predicted = [
    { month: "Jun", score: Math.min(95, Math.round(currentVal * 1.05)) },
    { month: "Jul", score: Math.min(95, Math.round(currentVal * 1.10)) },
    { month: "Aug", score: Math.min(96, Math.round(currentVal * 1.15)) },
    { month: "Sep", score: Math.min(97, Math.round(currentVal * 1.20)) },
    { month: "Oct", score: Math.min(98, Math.round(currentVal * 1.23)) },
    { month: "Nov", score: Math.min(99, Math.round(currentVal * 1.26)) },
    { month: "Dec", score: Math.min(99, Math.round(currentVal * 1.30)) },
  ];

  const acceleratedStudyPrediction = [
    { month: "Jun", score: Math.min(98, Math.round(currentVal * 1.10)) },
    { month: "Jul", score: Math.min(98, Math.round(currentVal * 1.18)) },
    { month: "Aug", score: Math.min(99, Math.round(currentVal * 1.25)) },
    { month: "Sep", score: Math.min(99, Math.round(currentVal * 1.32)) },
    { month: "Oct", score: Math.min(99, Math.round(currentVal * 1.38)) },
    { month: "Nov", score: 99 },
    { month: "Dec", score: 99 },
  ];

  return res.json({
    historical,
    predicted,
    acceleratedStudyPrediction
  });
});

export default router;
