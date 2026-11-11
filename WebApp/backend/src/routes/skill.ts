import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { supabaseAdmin } from "../config/supabase.js";

const router = Router();

const ROLE_SKILL_MAP: Record<string, { required: string[]; recommendations: string[]; priority: string }> = {
  "Machine Learning Engineer": {
    required: ["Python", "TensorFlow", "MLOps", "Docker", "PyTorch", "SQL"],
    recommendations: ["Learn TensorFlow basics", "Build ML deployment project", "Containerize models with Docker"],
    priority: "High",
  },
  "Data Scientist": {
    required: ["Python", "Pandas", "Scikit-Learn", "SQL", "Statistics", "Data Visualization"],
    recommendations: ["Master Data Wrangling with Pandas", "Build predictive ML models", "Create interactive dashboards"],
    priority: "High",
  },
  "Data Analyst": {
    required: ["Excel", "SQL", "Tableau", "PowerBI", "Python", "Communication"],
    recommendations: ["Complete SQL Query Optimization course", "Build Tableau analytics dashboard"],
    priority: "Medium",
  },
  "Frontend Developer": {
    required: ["JavaScript", "TypeScript", "React", "HTML/CSS", "TailwindCSS", "Next.js"],
    recommendations: ["Master TypeScript generics", "Build responsive web applications", "Learn Next.js App Router"],
    priority: "High",
  },
  "Full Stack Engineer": {
    required: ["React", "Node.js", "Express", "TypeScript", "PostgreSQL", "Docker"],
    recommendations: ["Build full-stack CRUD application", "Implement JWT auth & RLS", "Deploy on AWS/Vercel"],
    priority: "High",
  },
  "Cloud Engineer": {
    required: ["AWS", "Terraform", "Docker", "Kubernetes", "Linux", "CI/CD"],
    recommendations: ["Obtain AWS Certified Solutions Architect", "Deploy Kubernetes cluster", "Automate CI/CD pipelines"],
    priority: "High",
  },
};

// POST /api/skill/analyze
router.post("/analyze", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { targetRole, role, skills: userProvidedSkills } = req.body;
    const targetJobRole = targetRole || role || "Machine Learning Engineer";

    // Retrieve user skills from database or request body
    let currentSkills: string[] = Array.isArray(userProvidedSkills) ? userProvidedSkills : [];
    if (currentSkills.length === 0) {
      const { data: dbSkills } = await supabaseAdmin
        .from("skills")
        .select("name")
        .eq("user_id", userId);

      if (dbSkills && dbSkills.length > 0) {
        currentSkills = dbSkills.map((s) => s.name);
      } else {
        currentSkills = ["Python", "JavaScript", "SQL", "React"];
      }
    }

    const roleData = ROLE_SKILL_MAP[targetJobRole] || {
      required: ["Python", "TensorFlow", "MLOps", "Docker", "System Design"],
      recommendations: [`Master core requirements for ${targetJobRole}`, "Build hands-on portfolio projects"],
      priority: "High",
    };

    const currentSkillsLower = new Set(currentSkills.map((s) => s.toLowerCase()));
    const missingSkills = roleData.required.filter(
      (reqSkill) => !currentSkillsLower.has(reqSkill.toLowerCase())
    );

    const recommendedPath = roleData.recommendations;
    const priority = roleData.priority;

    // Persist to database (ai_insights table)
    const recordPayload = {
      id: "sg_" + Date.now(),
      target_job: targetJobRole,
      current_skills: currentSkills,
      missing_skills: missingSkills,
      recommended_path: recommendedPath,
      priority: priority,
      created_at: new Date().toISOString(),
    };

    try {
      await supabaseAdmin.from("ai_insights").insert({
        user_id: userId,
        category: "skill_gap_analysis",
        insight: JSON.stringify(recordPayload),
      });
    } catch (dbErr: any) {
      console.warn("ai_insights skill_gap_analysis insert warning:", dbErr?.message);
    }

    return res.json(recordPayload);
  } catch (err: any) {
    console.error("Skill Gap Analysis Error:", err);
    return res.status(500).json({ message: err.message || "Failed to perform skill gap analysis" });
  }
});

export default router;
