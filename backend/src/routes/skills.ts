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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { data: ats } = await supabaseAdmin.from("ats_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!ats) {
      return res.status(404).json({ message: "No resume found. Upload your resume to generate a skill gap analysis." });
    }

    const targetRole = ats.targetJob || "Professional";
    const matchPercentage = ats.score || 0;
    const keywordMatch = ats.keywordMatch || [];

    const gapSkills = keywordMatch.map((kw: any) => {
      const isFound = kw.status === "found";
      const current = isFound ? 85 : 15;
      const required = 80;
      const gap = current - required;
      const status = gap >= 0 ? "Met" : gap > -20 ? "Needs Improvement" : "Critical Gap";
      
      return {
        name: kw.word,
        current,
        required,
        gap,
        status
      };
    });

    return res.json({
      targetRole,
      matchPercentage,
      skills: gapSkills
    });
  } catch (err: any) {
    console.error("Skill Gap Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to calculate skill gap" });
  }

});

// =========================================================================
// SKILL GROWTH PREDICTION
// =========================================================================
router.get("/growth", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
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
