import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../config/supabase";

const router = Router();

// =========================================================================
// HELPER: USER STATE RETRIEVAL
// =========================================================================
async function getUserState(userId: string) {
  let profile = null;
  let skills = [];
  let assessments = [];
  
  try {
    const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
    profile = p;
    
    const { data: s } = await supabaseAdmin.from("skills").select("*").eq("user_id", userId);
    if (s) skills = s;
    
    const { data: a } = await supabaseAdmin.from("assessments").select("*").eq("user_id", userId);
    if (a) assessments = a;
  } catch (err) {
    console.error("Failed to load user state for recommendations", err);
  }
  
  return { profile, skills, assessments };
}

// =========================================================================
// 1. COURSE RECOMMENDATIONS
// =========================================================================
router.get("/courses", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: courses, error } = await supabaseAdmin.from("courses").select("*");
    if (error || !courses || courses.length === 0) {
      return res.json([]);
    }

    const { data: ats } = await supabaseAdmin.from("ats_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    
    let missingKeywords = [];
    if (ats && ats.keywordMatch) {
      missingKeywords = (ats.keywordMatch as any[]).filter(kw => kw.status === "missing").map(kw => kw.word.toLowerCase());
    }

    const recommendations = [];
    for (const course of courses) {
      const keywords = (course.keywords || []).map((k: string) => k.toLowerCase());
      const isMissingKeyword = keywords.some((kw: string) => missingKeywords.some((mk: string) => mk.includes(kw)));

      if (isMissingKeyword) {
        recommendations.push({
          title: course.title,
          provider: "CognifyAI Academy",
          duration: course.duration || "4 weeks",
          difficulty: course.difficulty || "Intermediate",
          reason: "Identified as a missing competency in your latest resume ATS scan."
        });
      }
    }

    return res.json(recommendations.slice(0, 3));
  } catch (err: any) {
    console.error("Courses Recommendation Error:", err);
    return res.status(500).json({ message: "Failed to fetch courses" });
  }
});

// =========================================================================
// 2. SIMILAR USERS (Peers with matching interests)
// =========================================================================
router.get("/similar-profiles", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { profile } = await getUserState(userId);
    const interests = profile?.interests || [];
    
    const { data: allProfiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, avatar, degree, interests")
      .neq("id", userId);
      
    if (error) throw error;
    
    if (!allProfiles || allProfiles.length === 0) {
      return res.json([]);
    }

    const recommendations = allProfiles.map(p => {
      const pInterests = p.interests || [];
      const common = pInterests.filter((i: string) => interests.includes(i));
      let match = 50;
      if (common.length > 0) match += 20 * common.length;
      if (p.degree === profile?.degree) match += 15;
      
      return {
        id: p.id,
        name: p.name || "Anonymous User",
        role: p.degree || "Professional",
        avatar: p.avatar,
        matchPercentage: Math.min(99, match),
        commonInterests: common.slice(0, 2)
      };
    });

    recommendations.sort((a, b) => b.matchPercentage - a.matchPercentage);
    return res.json(recommendations.slice(0, 3));
  } catch (err: any) {
    console.error("Similar Profiles Error:", err);
    return res.status(500).json({ message: "Failed to fetch similar profiles" });
  }
});

// =========================================================================
// 3. CERTIFICATION RECOMMENDATIONS
// =========================================================================
router.get("/certifications", authMiddleware, async (req: AuthRequest, res: Response) => {
  return res.json([]);
});

// =========================================================================
// 4. CAREER RECOMMENDATIONS
// =========================================================================
router.get("/careers", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    const { data: ats } = await supabaseAdmin.from("ats_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    
    if (!ats || !ats.targetJob) {
      return res.json([]);
    }
    
    return res.json([
      {
        role: ats.targetJob,
        matchPercentage: ats.score || 0,
        reason: "Based on your latest ATS resume parsing"
      }
    ]);
  } catch (err: any) {
    console.error("Careers Recommendation Error:", err);
    return res.status(500).json({ message: "Failed to fetch careers" });
  }
});

// =========================================================================
// 5. SKILL RECOMMENDATIONS
// =========================================================================
router.get("/skills", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    const { data: ats } = await supabaseAdmin.from("ats_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    
    if (!ats || !ats.keywordMatch) {
      return res.json([]);
    }
    
    const missing = (ats.keywordMatch as any[]).filter(kw => kw.status === "missing").map(kw => ({
      name: kw.word,
      category: "Suggested",
      importance: "High",
      reason: "Missing from your current resume for target role"
    }));
    
    return res.json(missing);
  } catch (err: any) {
    console.error("Skills Recommendation Error:", err);
    return res.status(500).json({ message: "Failed to fetch skills" });
  }
});

// =========================================================================
// 6. JOB RECOMMENDATIONS
// =========================================================================
router.get("/jobs", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    const { data: jobs, error } = await supabaseAdmin.from("jobs").select("*");
    if (error) throw error;
    
    if (!jobs || jobs.length === 0) {
      return res.json([]);
    }
    
    const { data: ats } = await supabaseAdmin.from("ats_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const targetJob = ats?.targetJob?.toLowerCase() || "";
    
    const recommended = jobs.map(job => {
      let match = job.match || 50;
      if (targetJob && job.title.toLowerCase().includes(targetJob)) {
        match += 30;
      }
      return {
        ...job,
        match: Math.min(99, match)
      };
    }).sort((a, b) => b.match - a.match);
    
    return res.json(recommended.slice(0, 5));
  } catch (err: any) {
    console.error("Jobs Recommendation Error:", err);
    return res.status(500).json({ message: "Failed to fetch jobs" });
  }
});

export default router;
