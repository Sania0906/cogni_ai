import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";
import skillRouter from "./skill.js";

const router = Router();

// Mount singular /analyze compatibility route
router.use("/", skillRouter);

// =========================================================================
// HELPER: USER STATE RETRIEVAL
// =========================================================================
async function getUserState(userId: string) {
  let profile: any = null;
  let skills: any[] = [];
  let assessments: any[] = [];

  try {
    const { data: p } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    profile = p;
    const { data: s } = await supabaseAdmin
      .from("skills")
      .select("*")
      .eq("user_id", userId);
    skills = s || [];
    const { data: a } = await supabaseAdmin
      .from("assessments")
      .select("*")
      .eq("user_id", userId);
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
    return res
      .status(500)
      .json({ message: err.message || "Failed to retrieve skills" });
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
        user_id: req.user?.id,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json(data);
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to save skill" });
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
        updated_at: new Date().toISOString(),
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
    return res
      .status(500)
      .json({ message: err.message || "Failed to update skill" });
  }
});

// =========================================================================
// DELETE A SKILL
// =========================================================================
router.delete(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
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
      return res
        .status(500)
        .json({ message: err.message || "Failed to delete skill" });
    }
  },
);

// =========================================================================
// SKILL GAP ANALYSIS
// =========================================================================
router.get("/gap", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { data: ats } = await supabaseAdmin
      .from("ats_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let strengths = ats?.strengths || [];
    let weaknesses = ats?.weaknesses || [];
    let targetRole = (ats as any)?.targetJob || "Senior Full Stack Architect";
    let matchPercentage = ats?.score || 78;

    // If no ATS report exists yet, inspect skills table or provide dynamic baseline
    if (!ats) {
      const { data: userSkills } = await supabaseAdmin
        .from("skills")
        .select("name")
        .eq("user_id", userId);

      if (userSkills && userSkills.length > 0) {
        strengths = userSkills.map((s: any) => s.name);
        weaknesses = ["System Design", "Cloud Infrastructure", "Kubernetes", "GraphQL"];
        matchPercentage = 80;
      } else {
        strengths = ["JavaScript", "React", "TypeScript", "Node.js"];
        weaknesses = ["System Design", "AWS", "Docker", "PostgreSQL"];
        matchPercentage = 75;
      }
    }

    const gapSkills = [
      ...strengths.map((word: string) => ({
        name: word,
        current: 85,
        required: 80,
        gap: 5,
        missing_gap: 0,
        gap_percentage: 5,
        status: "Met",
      })),
      ...weaknesses.map((word: string) => ({
        name: word,
        current: 15,
        required: 80,
        gap: -65,
        missing_gap: 65,
        gap_percentage: 65,
        status: "Critical Gap",
      })),
    ];

    return res.json({
      targetRole,
      matchPercentage,
      skills: gapSkills,
    });
  } catch (err: any) {
    console.error("Skill Gap Fetch Error:", err.message);
    return res
      .status(500)
      .json({ message: err.message || "Failed to calculate skill gap" });
  }
});

// =========================================================================
// SKILL GROWTH PREDICTION
// =========================================================================
router.get(
  "/growth",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const { assessments } = await getUserState(userId);

    const avgAssessment =
      assessments && assessments.length > 0
        ? Math.round(
            assessments.reduce((sum, a) => sum + a.score, 0) /
              assessments.length,
          )
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
      { month: "Jul", score: Math.min(95, Math.round(currentVal * 1.1)) },
      { month: "Aug", score: Math.min(96, Math.round(currentVal * 1.15)) },
      { month: "Sep", score: Math.min(97, Math.round(currentVal * 1.2)) },
      { month: "Oct", score: Math.min(98, Math.round(currentVal * 1.23)) },
      { month: "Nov", score: Math.min(99, Math.round(currentVal * 1.26)) },
      { month: "Dec", score: Math.min(99, Math.round(currentVal * 1.3)) },
    ];

    const acceleratedStudyPrediction = [
      { month: "Jun", score: Math.min(98, Math.round(currentVal * 1.1)) },
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
      acceleratedStudyPrediction,
    });
  },
);

// =========================================================================
// GET SINGLE SKILL DETAILS (Dynamic Route Support)
// =========================================================================
router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    let skillRecord: any = null;

    // Check by ID if UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid && userId) {
      const { data } = await supabaseAdmin
        .from("skills")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      skillRecord = data;
    }

    // Check by name or slug
    const cleanName = decodeURIComponent(id).replace(/[-_]/g, " ").trim();
    if (!skillRecord && userId) {
      const { data } = await supabaseAdmin
        .from("skills")
        .select("*")
        .eq("user_id", userId)
        .ilike("name", `%${cleanName}%`)
        .maybeSingle();
      skillRecord = data;
    }

    const displayName = skillRecord?.name || cleanName.replace(/\b\w/g, (c) => c.toUpperCase());
    const progress = skillRecord?.progress ?? 82;
    const level = skillRecord?.level || (progress > 80 ? "Advanced" : progress > 50 ? "Intermediate" : "Beginner");

    return res.json({
      id: skillRecord?.id || id,
      name: displayName,
      category: skillRecord?.category || "Technical",
      level,
      progress,
      growth: "+14%",
      rank: progress > 80 ? "Top 5%" : progress > 60 ? "Top 15%" : "Top 30%",
      coursesCount: 3,
      projectsCount: Math.round(progress / 8),
      recommendedCourses: [
        { title: `${displayName} Core Patterns & Advanced Techniques`, duration: "6 hrs · 14 lessons", link: "/courses" },
        { title: `Applied ${displayName} for Enterprise Scale`, duration: "8 hrs · 18 lessons", link: "/courses" },
        { title: `${displayName} Production Certification Prep`, duration: "4 hrs · 10 lessons", link: "/courses" },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to retrieve skill details" });
  }
});

export default router;
