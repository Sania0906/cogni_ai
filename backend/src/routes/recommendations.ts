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
    console.error("Error retrieving user state for recommendations:", err);
  }
  
  return { profile, skills, assessments };
}

// =========================================================================
// 1. COURSE RECOMMENDATIONS
// =========================================================================
router.get("/courses", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";
  const { profile, skills, assessments } = await getUserState(userId);
  
  // 1. Fetch latest ATS report weaknesses
  let missingKeywords: string[] = [];
  try {
    const { data: latestAts } = await supabaseAdmin
      .from("ats_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (latestAts && latestAts.weaknesses) {
      missingKeywords = latestAts.weaknesses.map((w: string) => w.toLowerCase());
    }
  } catch (err) {
    console.error("Failed to query latest ATS report for course recommendations:", err);
  }

  // 2. Fetch assessment weaknesses (score < 75)
  const weakAssessments = assessments.filter(a => a.score < 75).map(a => a.category.toLowerCase());

  // 3. Fetch skill gaps
  const interests = profile?.interests || [];
  let requiredSkills = ["Python", "Machine Learning", "Deep Learning", "SQL", "TensorFlow", "MLOps", "Data Visualization"];

  if (interests.some((i: string) => i.toLowerCase().includes("ai") || i.toLowerCase().includes("ml") || i.toLowerCase().includes("machine"))) {
    requiredSkills = ["Python", "Deep Learning", "PyTorch", "MLOps", "Cloud APIs"];
  } else if (interests.some((i: string) => i.toLowerCase().includes("web") || i.toLowerCase().includes("stack") || i.toLowerCase().includes("javascript") || i.toLowerCase().includes("react"))) {
    requiredSkills = ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "NoSQL"];
  } else if (interests.some((i: string) => i.toLowerCase().includes("cloud") || i.toLowerCase().includes("devops"))) {
    requiredSkills = ["Cloud Platforms", "Docker", "Kubernetes", "Linux", "Python", "Bash"];
  } else if (interests.some((i: string) => i.toLowerCase().includes("security") || i.toLowerCase().includes("cyber"))) {
    requiredSkills = ["Network Security", "Penetration Testing", "Linux", "Cryptography"];
  }

  const missingSkills = requiredSkills.filter(reqSkill => {
    const userSkill = skills.find(s => s.name.toLowerCase().includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(s.name.toLowerCase()));
    if (!userSkill) return true;
    return (userSkill.progress || 50) < 60;
  });

  const recommendations = [];

  const courseCatalog = [
    { id: "course_3", title: "Python for Data Science Foundations", keywords: ["python", "programming", "code"], duration: "4 weeks", difficulty: "Beginner", reason: "Identified gap in core Python programming skills" },
    { id: "course_web_2", title: "SQL & Databases Course", keywords: ["sql", "database", "postgres", "nosql"], duration: "5 weeks", difficulty: "Intermediate", reason: "Crucial database operations competency missing" },
    { id: "course_2", title: "Deep Learning Foundations", keywords: ["deep learning", "pytorch", "tensorflow", "neural", "ai", "ml"], duration: "6 weeks", difficulty: "Intermediate", reason: "Essential for modern AI/ML model deployment roles" },
    { id: "course_4", title: "MLOps: Deploying Models to Production", keywords: ["mlops", "docker", "kubernetes", "containers", "deployment"], duration: "8 weeks", difficulty: "Advanced", reason: "Highly relevant advanced deployment pipeline instruction" },
    { id: "course_web_1", title: "React Web Development", keywords: ["react", "web", "javascript", "typescript", "frontend"], duration: "8 weeks", difficulty: "Intermediate", reason: "Identified weakness in web development or frontend scripting" },
    { id: "course_cloud_1", title: "Cloud Architecture Foundations", keywords: ["cloud", "aws", "gcp", "azure", "platforms"], duration: "7 weeks", difficulty: "Intermediate", reason: "Recommended cloud computing foundations for infrastructure deployment" },
    { id: "course_sec_1", title: "Security & Penetration Testing", keywords: ["security", "penetration", "cryptography", "network security"], duration: "9 weeks", difficulty: "Advanced", reason: "Addresses critical gaps in networks and system security auditing" },
    { id: "course_1", title: "Advanced Machine Learning", keywords: ["machine learning", "scikit-learn", "regression", "ml"], duration: "8 weeks", difficulty: "Advanced", reason: "Builds core statistical modeling and ML implementation skills" }
  ];

  for (const course of courseCatalog) {
    const isMissingSkill = course.keywords.some(kw => missingSkills.some(ms => ms.toLowerCase().includes(kw) || kw.includes(ms.toLowerCase())));
    const isMissingKeyword = course.keywords.some(kw => missingKeywords.some(mk => mk.includes(kw)));
    const isWeakAssessment = course.keywords.some(kw => weakAssessments.some(wa => wa.includes(kw)));

    if (isMissingSkill || isMissingKeyword || isWeakAssessment) {
      let specificReason = course.reason;
      if (isWeakAssessment) {
        specificReason = `Recommended to address your assessment score weakness.`;
      } else if (isMissingKeyword) {
        specificReason = `Identified as a missing competency in your latest resume ATS scan.`;
      }
      
      recommendations.push({
        title: course.title,
        provider: "CognifyAI Academy",
        duration: course.duration,
        difficulty: course.difficulty,
        reason: specificReason
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Python for Data Science Foundations",
      provider: "CognifyAI Academy",
      duration: "4 weeks",
      difficulty: "Beginner",
      reason: "Excellent general course to build a quantitative foundation."
    });
    recommendations.push({
      title: "Advanced Machine Learning",
      provider: "CognifyAI Academy",
      duration: "8 weeks",
      difficulty: "Advanced",
      reason: "Highly requested capability for general data science and analytics."
    });
  }

  return res.json(recommendations.slice(0, 3));
});

// =========================================================================
// 2. CERTIFICATION RECOMMENDATIONS
// =========================================================================
router.get("/certifications", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { profile } = await getUserState(req.user?.id || "mock_user");
  
  const certs = [];
  const interests = profile?.interests || [];
  const isCloud = interests.some((i: string) => i.toLowerCase().includes("cloud"));
  const isAi = interests.some((i: string) => i.toLowerCase().includes("ai") || i.toLowerCase().includes("ml") || i.toLowerCase().includes("machine"));
  
  if (isCloud) {
    certs.push({
      name: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      cost: "$100",
      reason: "Highly requested for Cloud Architect and MLOps roles"
    });
  }
  if (isAi) {
    certs.push({
      name: "Google Professional ML Engineer",
      issuer: "Google Cloud",
      cost: "$200",
      reason: "Demonstrates production AI/ML deployment competencies"
    });
  }
  
  certs.push({
    name: "TensorFlow Developer Certificate",
    issuer: "Google / TensorFlow",
    cost: "$150",
    reason: "Validates deep learning model construction skills"
  });
  
  certs.push({
    name: "Microsoft Certified: Azure Data Scientist Associate",
    issuer: "Microsoft",
    cost: "$165",
    reason: "Strong fit for enterprise data pipeline deployment"
  });
  
  return res.json(certs);
});

// =========================================================================
// 3. CAREER RECOMMENDATIONS
// =========================================================================
router.get("/careers", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { profile } = await getUserState(req.user?.id || "mock_user");
  
  const pathsDef = [
    { role: "Data Scientist", baseMatch: 80, reason: "Matches quantitative degree and skills" },
    { role: "AI Engineer", baseMatch: 75, reason: "Excellent alignment with machine learning goals" },
    { role: "Full Stack Developer", baseMatch: 60, reason: "Good choice if seeking user interface engineering roles" },
    { role: "Cloud Engineer", baseMatch: 55, reason: "Requires AWS or containerization competencies" },
    { role: "Cybersecurity Analyst", baseMatch: 50, reason: "Requires security-specific certifications" }
  ];
  
  const mapped = pathsDef.map(p => {
    let matchBonus = 0;
    const interests = profile?.interests || [];
    if (p.role === "Data Scientist" && (profile?.degree?.toLowerCase().includes("data") || interests.some((i: string) => i.toLowerCase().includes("data")))) {
      matchBonus += 15;
    }
    if (p.role === "AI Engineer" && interests.some((i: string) => i.toLowerCase().includes("ai") || i.toLowerCase().includes("ml") || i.toLowerCase().includes("machine"))) {
      matchBonus += 18;
    }
    if (p.role === "Full Stack Developer" && interests.some((i: string) => i.toLowerCase().includes("web") || i.toLowerCase().includes("stack") || i.toLowerCase().includes("javascript"))) {
      matchBonus += 25;
    }
    if (p.role === "Cloud Engineer" && interests.some((i: string) => i.toLowerCase().includes("cloud"))) {
      matchBonus += 25;
    }
    if (p.role === "Cybersecurity Analyst" && interests.some((i: string) => i.toLowerCase().includes("security") || i.toLowerCase().includes("cyber"))) {
      matchBonus += 30;
    }
    
    return {
      role: p.role,
      matchPercentage: Math.min(99, p.baseMatch + matchBonus),
      reason: p.reason
    };
  });
  
  mapped.sort((a, b) => b.matchPercentage - a.matchPercentage);
  
  return res.json(mapped);
});

// =========================================================================
// 4. SKILL RECOMMENDATIONS
// =========================================================================
router.get("/skills", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { skills } = await getUserState(req.user?.id || "mock_user");
  
  const recommendedSkills = [
    { name: "Python", category: "Programming", importance: "High", reason: "Foundation of all modern data & backend platforms" },
    { name: "Machine Learning", category: "AI/ML", importance: "High", reason: "Standard requirement for intelligent systems engineering" },
    { name: "SQL & Databases", category: "Data Science", importance: "Medium", reason: "Needed for data extraction and dashboard feeds" },
    { name: "Docker & Containerization", category: "MLOps", importance: "Medium", reason: "Key tool for cloud deployment and reproducibility" }
  ];
  
  const userSkillNames = skills.map((s: any) => s.name.toLowerCase());
  const filtered = recommendedSkills.filter(s => !userSkillNames.some(us => us.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(us)));
  
  return res.json(filtered.length > 0 ? filtered : recommendedSkills.slice(2));
});

// =========================================================================
// 5. JOB RECOMMENDATIONS
// =========================================================================
router.get("/jobs", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { skills, assessments } = await getUserState(req.user?.id || "mock_user");
  
  const rawJobs = [
    { title: "Senior Data Scientist", company: "TechCorp", loc: "San Francisco, CA", type: "Full-time", salary: "$140k - $180k", match: 92, requirements: ["Python", "Machine Learning", "SQL"] },
    { title: "ML Engineer", company: "AIVision", loc: "Remote", type: "Full-time", salary: "$130k - $170k", match: 88, requirements: ["Python", "PyTorch", "TensorFlow"] },
    { title: "AI Research Scientist", company: "NeuralLabs", loc: "New York, NY", type: "Full-time", salary: "$160k - $220k", match: 84, requirements: ["Deep Learning", "Transformers", "Math"] },
    { title: "MLOps Engineer", company: "SystemsInc", loc: "Remote", type: "Full-time", salary: "$120k - $155k", match: 70, requirements: ["Docker", "MLflow", "FastAPI"] },
    { title: "Software Engineer (Backend)", company: "CloudWeb", loc: "Austin, TX", type: "Full-time", salary: "$110k - $145k", match: 75, requirements: ["Node.js", "SQL", "Git"] }
  ];
  
  const userSkillNames = skills.map((s: any) => s.name.toLowerCase());
  const userAssessCategories = assessments.map((a: any) => a.category.toLowerCase());
  
  const mappedJobs = rawJobs.map(job => {
    let matchedCount = 0;
    job.requirements.forEach(req => {
      const reqLower = req.toLowerCase();
      const hasS = userSkillNames.some(us => us.includes(reqLower) || reqLower.includes(us));
      const hasA = userAssessCategories.some(ac => {
        if (reqLower.includes("python") || reqLower.includes("code")) return ac.includes("prog");
        if (reqLower.includes("machine") || reqLower.includes("learning") || reqLower.includes("torch") || reqLower.includes("flow")) return ac.includes("ai") || ac.includes("ml");
        if (reqLower.includes("sql") || reqLower.includes("database")) return ac.includes("db") || ac.includes("data");
        return false;
      });
      
      if (hasS || hasA) {
        matchedCount++;
      }
    });
    
    const matchPct = Math.round((matchedCount / job.requirements.length) * 50) + 45;
    
    return {
      ...job,
      match: matchPct
    };
  });
  
  mappedJobs.sort((a, b) => b.match - a.match);
  
  return res.json(mappedJobs);
});

export default router;
