import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import multer from "multer";
import { createRequire } from "module";
import { supabaseAdmin } from "../config/supabase";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// =========================================================================
// HELPER: ONBOARDING DEPENDENCY VERIFICATION
// =========================================================================
async function checkOnboarding(userId: string) {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const { data: assessments } = await supabaseAdmin
      .from("assessments")
      .select("*")
      .eq("user_id", userId);

    const { data: resume } = await supabaseAdmin
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const profileComplete = !!(profile?.onboarding_completed || (profile?.degree && profile?.college));
    const assessmentTaken = !!(assessments && assessments.length > 0);
    const resumeUploaded = !!resume;

    if (!profileComplete || !assessmentTaken || !resumeUploaded) {
      return {
        locked: true,
        message: "AI Career insights are locked. Please complete your profile details, upload your resume, and finish at least one skill assessment.",
        checklist: {
          profile: profileComplete,
          assessment: assessmentTaken,
          resume: resumeUploaded
        }
      };
    }

    return {
      locked: false,
      userProfile: profile,
      userResume: resume,
      userAssessments: assessments || []
    };
  } catch (err) {
    console.error("Supabase Onboarding Check Error:", err);
    return {
      locked: true,
      message: "An error occurred while verifying your onboarding status.",
      checklist: {
        profile: false,
        assessment: false,
        resume: false
      }
    };
  }
}

// =========================================================================
// 1. AI CAREER DNA REPORT
// =========================================================================
router.get("/career-dna", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";

  try {
    const { data: existingDna } = await supabaseAdmin
      .from("career_dna")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingDna) {
      return res.json({
        archetype: existingDna.archetype,
        tagline: existingDna.tagline,
        dimensions: existingDna.dimensions,
        strengths: existingDna.strengths,
        weaknesses: existingDna.weaknesses,
        recommendedEnvironments: existingDna.recommended_environments
      });
    }
  } catch (err) {
    console.error("Failed to query career_dna:", err);
  }

  const check = await checkOnboarding(userId);
  if (check.locked) {
    return res.status(403).json(check);
  }

  const { userProfile, userResume, userAssessments } = check;

  // Extract assessment scores
  const progScore = userAssessments?.find(a => a.category.toLowerCase().includes("prog"))?.score || 80;
  const dbScore = userAssessments?.find(a => a.category.toLowerCase().includes("db") || a.category.toLowerCase().includes("data"))?.score || 75;
  const aiScore = userAssessments?.find(a => a.category.toLowerCase().includes("ai") || a.category.toLowerCase().includes("ml"))?.score || 70;
  const cloudScore = userAssessments?.find(a => a.category.toLowerCase().includes("cloud") || a.category.toLowerCase().includes("sys"))?.score || 70;
  const webScore = userAssessments?.find(a => a.category.toLowerCase().includes("web") || a.category.toLowerCase().includes("front"))?.score || 75;
  const aptScore = userAssessments?.find(a => a.category.toLowerCase().includes("apt") || a.category.toLowerCase().includes("logic"))?.score || 80;

  // Dynamic Archetype
  let archetype = "The Algorithmic Architect";
  let tagline = "Highly analytical and detail-oriented, with a natural talent for abstract system designing.";
  
  if (webScore > progScore && webScore > aiScore) {
    archetype = "The Interface Virtuoso";
    tagline = "Visually creative and systems-savvy, bringing user interfaces to life with elegant designs.";
  } else if (aiScore > progScore && aiScore > webScore) {
    archetype = "The Cognitive Scientist";
    tagline = "Intrigued by neural systems, pattern matching, and predicting future trends from complex data models.";
  } else if (dbScore > progScore && dbScore > webScore) {
    archetype = "The Schema Strategist";
    tagline = "Optimizing data stores, pipelines, and indexes for speed and reliable data processing.";
  }

  const maxTech = Math.max(progScore, dbScore, aiScore, webScore, cloudScore);
  const leadershipScore = userProfile?.cgpa ? Math.min(100, Math.round(Number(userProfile.cgpa) * 10) + 15) : 70;

  const dimensions = [
    { subject: "Analytical Thinking", val: aptScore, angle: 0 },
    { subject: "Creative Problem Solving", val: progScore, angle: 60 },
    { subject: "System Architecture", val: cloudScore, angle: 120 },
    { subject: "Adaptability", val: 80, angle: 180 },
    { subject: "Technical Expertise", val: maxTech, angle: 240 },
    { subject: "Collaborative Leadership", val: leadershipScore, angle: 300 },
  ];

  const strengths = [
    `Excellent core technical capability in ${userProfile?.degree || "Engineering"} domains.`,
    `Strong analytical skills verified by assessment scores.`,
    `Detail-oriented system mapping capabilities.`
  ];

  const weaknesses = [
    "Can focus heavily on details rather than pushing out simple mvp products.",
    "Requires additional experience presenting data reports to non-technical partners.",
    "Tends to work best in individual flow states rather than sync reviews."
  ];

  const recommendedEnvironments = [
    "Research labs / R&D Quantitative divisions",
    "Fast scaling product startups",
    "Distributed systems and platform infrastructure teams"
  ];

  try {
    await supabaseAdmin
      .from("career_dna")
      .upsert({
        user_id: userId,
        archetype,
        tagline,
        dimensions,
        strengths,
        weaknesses,
        recommended_environments: recommendedEnvironments
      });
  } catch (saveErr) {
    console.error("Failed to save career_dna:", saveErr);
  }

  return res.json({
    archetype,
    tagline,
    dimensions,
    strengths,
    weaknesses,
    recommendedEnvironments
  });
});

// =========================================================================
// 2. CAREER SUCCESS PROBABILITY
// =========================================================================
router.get("/career-success", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";

  try {
    const { data: existingInsight } = await supabaseAdmin
      .from("ai_insights")
      .select("*")
      .eq("user_id", userId)
      .eq("category", "career-success")
      .maybeSingle();

    if (existingInsight) {
      return res.json(JSON.parse(existingInsight.insight));
    }
  } catch (err) {
    console.error("Failed to query ai_insights:", err);
  }

  const check = await checkOnboarding(userId);
  if (check.locked) {
    return res.status(403).json(check);
  }

  const { userProfile, userResume, userAssessments } = check;
  
  // Calculate average of assessment scores
  const avgAssessment = userAssessments && userAssessments.length > 0
    ? Math.round(userAssessments.reduce((sum, a) => sum + a.score, 0) / userAssessments.length)
    : 80;

  const atsScore = userResume?.ats_score || 75;
  const cgpaFactor = userProfile?.cgpa ? Math.round(parseFloat(userProfile.cgpa) * 10) : 80;

  const probabilityScore = Math.round((avgAssessment + atsScore + cgpaFactor) / 3);

  const interests = (userProfile?.interests || []).map((i: string) => i.toLowerCase().trim());
  const hasWeb = interests.some((t: string) => t.includes("web") || t.includes("stack") || t.includes("javascript") || t.includes("react"));
  const hasCloud = interests.some((t: string) => t.includes("cloud") || t.includes("aws") || t.includes("devops"));
  const hasSecurity = interests.some((t: string) => t.includes("security") || t.includes("cyber"));

  let targetRole = "Senior Data Scientist";
  let alternativeRoles = [
    { role: "Machine Learning Engineer", probability: Math.max(40, probabilityScore - 4) },
    { role: "Data Solutions Architect", probability: Math.max(40, probabilityScore - 8) },
    { role: "Quantitative Analyst", probability: Math.max(40, probabilityScore - 15) }
  ];

  if (hasWeb) {
    targetRole = "Senior Full Stack Developer";
    alternativeRoles = [
      { role: "Frontend UI Architect", probability: Math.max(40, probabilityScore - 4) },
      { role: "Backend Node.js Developer", probability: Math.max(40, probabilityScore - 8) },
      { role: "DevOps Engineer", probability: Math.max(40, probabilityScore - 15) }
    ];
  } else if (hasCloud) {
    targetRole = "Cloud Solutions Architect";
    alternativeRoles = [
      { role: "MLOps Platform Engineer", probability: Math.max(40, probabilityScore - 4) },
      { role: "DevOps Engineer", probability: Math.max(40, probabilityScore - 8) },
      { role: "Site Reliability Engineer", probability: Math.max(40, probabilityScore - 15) }
    ];
  } else if (hasSecurity) {
    targetRole = "Cybersecurity Lead Analyst";
    alternativeRoles = [
      { role: "Penetration Tester / Red Teamer", probability: Math.max(40, probabilityScore - 4) },
      { role: "Security Systems Engineer", probability: Math.max(40, probabilityScore - 8) },
      { role: "Security Auditor / Architect", probability: Math.max(40, probabilityScore - 15) }
    ];
  }

  const result = {
    targetRole,
    probabilityScore,
    breakdown: [
      { name: "Technical Skill Fit", rating: avgAssessment, detail: `Your assessment average across skill categories is ${avgAssessment}%.` },
      { name: "Resume Impact (ATS)", rating: atsScore, detail: `Your uploaded resume matches ATS benchmarks at ${atsScore}%.` },
      { name: "Academic Standing", rating: cgpaFactor, detail: `Your CGPA of ${userProfile?.cgpa || "N/A"} places you in the quantitative top tier.` },
      { name: "Market Liquidity / Openings", rating: 90, detail: "Strong market demand indicates rapid hiring speed (average 22 days to offer)." }
    ],
    growthOutlook: "Very Strong",
    alternativeRoles
  };

  try {
    await supabaseAdmin
      .from("ai_insights")
      .insert({
        user_id: userId,
        category: "career-success",
        insight: JSON.stringify(result)
      });
  } catch (saveErr) {
    console.error("Failed to save ai_insights:", saveErr);
  }

  return res.json(result);
});

// =========================================================================
// 3. INDUSTRY DEMAND INTELLIGENCE (UNLOCKED BY DEFAULT)
// =========================================================================
router.get("/industry-demand", async (req, res) => {
  try {
    let { data: categories } = await supabaseAdmin
      .from("market_insights")
      .select("*");

    if (!categories || categories.length === 0) {
      console.log("[Supabase Market Insights] Seeding default market categories...");
      const DEFAULT_MARKET_INSIGHTS = [
        { category: "AI/ML Engineering", growth_rate: 38.4, openings_count: 12400, average_salary: 168000, market_drivers: ["Accelerated integration of Generative AI in enterprise operations."] },
        { category: "Data Science & Analytics", growth_rate: 22.8, openings_count: 18500, average_salary: 145000, market_drivers: ["Surge in cloud native data processing pipelines and vector database scaling."] },
        { category: "Cloud MLOps & Systems", growth_rate: 42.1, openings_count: 8900, average_salary: 172000, market_drivers: ["Increasing focus on local inference, edge computing, and model quantization."] },
        { category: "Web / Full Stack (React)", growth_rate: 12.5, openings_count: 45000, average_salary: 120000, market_drivers: ["Adoption of modern frontend frameworks and SSR architectures."] },
        { category: "Mobile Development", growth_rate: 8.2, openings_count: 14000, average_salary: 115000, market_drivers: ["Cross-platform app developments with React Native or Flutter."] }
      ];
      await supabaseAdmin.from("market_insights").insert(DEFAULT_MARKET_INSIGHTS);
      const { data: refetched } = await supabaseAdmin.from("market_insights").select("*");
      categories = refetched || [];
    }

    const mapped = (categories || []).map(item => ({
      name: item.category,
      growth: Number(item.growth_rate),
      openings: item.openings_count,
      salary: Number(item.average_salary),
      trend: Number(item.growth_rate) >= 20 ? "up" : "stable"
    }));

    const marketDrivers = categories && categories.length > 0 
      ? Array.from(new Set(categories.flatMap(item => item.market_drivers || [])))
      : [
          "Accelerated integration of Generative AI in enterprise operations.",
          "Surge in cloud native data processing pipelines and vector database scaling.",
          "Increasing focus on local inference, edge computing, and model quantization."
        ];

    return res.json({
      categories: mapped,
      marketDrivers
    });
  } catch (err: any) {
    console.error("Failed to query market_insights:", err);
    return res.status(500).json({ message: "Failed to retrieve market demands" });
  }
});

// =========================================================================
// 4. AI LEARNING ROADMAP GENERATOR
// =========================================================================
router.get("/roadmap", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";
  const check = await checkOnboarding(userId);
  if (check.locked) {
    return res.status(403).json(check);
  }

  const { userProfile, userResume, userAssessments } = check;

  const progScore = userAssessments?.find(a => a.category.toLowerCase().includes("prog"))?.score || 80;
  const dbScore = userAssessments?.find(a => a.category.toLowerCase().includes("db") || a.category.toLowerCase().includes("data"))?.score || 75;
  const aiScore = userAssessments?.find(a => a.category.toLowerCase().includes("ai") || a.category.toLowerCase().includes("ml"))?.score || 70;
  const cloudScore = userAssessments?.find(a => a.category.toLowerCase().includes("cloud"))?.score || 70;
  const webScore = userAssessments?.find(a => a.category.toLowerCase().includes("web"))?.score || 75;
  const aptScore = userAssessments?.find(a => a.category.toLowerCase().includes("apt") || a.category.toLowerCase().includes("logic"))?.score || 80;

  // Fetch actual skills for dynamic status override
  let userSkills: any[] = [];
  try {
    const { data: s } = await supabaseAdmin.from("skills").select("name").eq("user_id", userId);
    userSkills = s || [];
  } catch (err) {
    console.warn("Failed to fetch user skills for roadmap:", err);
  }
  const userSkillNames = userSkills.map(s => s.name.toLowerCase().trim());

  const determineStatus = (nodeSkills: string[], assessScore: number) => {
    const hasAll = nodeSkills.every(ns => userSkillNames.some(us => us.includes(ns.toLowerCase()) || ns.toLowerCase().includes(us)));
    if (hasAll || assessScore >= 85) return "completed";
    const hasAny = nodeSkills.some(ns => userSkillNames.some(us => us.includes(ns.toLowerCase()) || ns.toLowerCase().includes(us)));
    if (hasAny || assessScore >= 65) return "in-progress";
    return "upcoming";
  };

  const interests = (userProfile?.interests || []).map((i: string) => i.toLowerCase().trim());
  const hasWeb = interests.some((t: string) => t.includes("web") || t.includes("stack") || t.includes("javascript") || t.includes("react") || t.includes("frontend") || t.includes("backend"));
  const hasCloud = interests.some((t: string) => t.includes("cloud") || t.includes("aws") || t.includes("devops") || t.includes("docker") || t.includes("kubernetes"));
  const hasSecurity = interests.some((t: string) => t.includes("security") || t.includes("cyber"));

  let goal = "Become a Senior Data Scientist";
  let nodes = [];

  if (hasWeb) {
    goal = "Become a Full Stack Developer";
    nodes = [
      {
        id: "step-1",
        title: "Frontend Basics & JavaScript Foundations",
        description: "Master HTML5, CSS3, and core ES6 JavaScript concepts.",
        duration: "4 weeks",
        status: determineStatus(["HTML", "CSS", "JavaScript"], webScore),
        skills: ["HTML", "CSS", "JavaScript"],
        courses: ["React Web Development"]
      },
      {
        id: "step-2",
        title: "React & Client-Side Architectures",
        description: "Learn state management, hooks, routing, and responsive designs.",
        duration: "6 weeks",
        status: determineStatus(["React", "TypeScript", "Tailwind CSS"], webScore),
        skills: ["React", "TypeScript", "Tailwind CSS"],
        courses: ["React Web Development"]
      },
      {
        id: "step-3",
        title: "Node.js & Backend REST APIs",
        description: "Build Express.js servers, configure middle-wares, and secure endpoints.",
        duration: "5 weeks",
        status: determineStatus(["Node.js", "Express"], progScore),
        skills: ["Node.js", "Express", "JWT Auth"],
        courses: ["SQL & Databases Course"]
      },
      {
        id: "step-4",
        title: "Database Scaling & Deployments",
        description: "Master schema normalization, database scaling, indexes, and cloud hosting.",
        duration: "5 weeks",
        status: determineStatus(["PostgreSQL", "Supabase"], dbScore),
        skills: ["PostgreSQL", "Supabase", "NoSQL"],
        courses: ["SQL & Databases Course"]
      }
    ];
  } else if (hasCloud) {
    goal = "Become a Cloud & MLOps Engineer";
    nodes = [
      {
        id: "step-1",
        title: "Linux Systems & Scripting",
        description: "Master command-line interfaces, filesystem management, and bash/python scripting.",
        duration: "4 weeks",
        status: determineStatus(["Linux", "Bash", "Python"], progScore),
        skills: ["Linux", "Bash", "Python"],
        courses: ["Python for Data Science"]
      },
      {
        id: "step-2",
        title: "Cloud Infrastructure Foundations",
        description: "Learn VPCs, IAM policies, compute instances, and serverless compute functions.",
        duration: "5 weeks",
        status: determineStatus(["AWS", "VPC", "Serverless"], cloudScore),
        skills: ["AWS", "VPC", "Serverless"],
        courses: ["Cloud Architecture Foundations"]
      },
      {
        id: "step-3",
        title: "Containers & Orchestrations",
        description: "Dockerize applications and deploy them on Kubernetes orchestrators.",
        duration: "6 weeks",
        status: determineStatus(["Docker", "Kubernetes", "CI/CD"], cloudScore),
        skills: ["Docker", "Kubernetes", "CI/CD"],
        courses: ["MLOps: Deploying Models to Production"]
      },
      {
        id: "step-4",
        title: "MLOps Platform Orchestrations",
        description: "Build automated pipeline pipelines using MLflow, Kubeflow, and model registries.",
        duration: "5 weeks",
        status: determineStatus(["MLflow"], aiScore),
        skills: ["MLflow", "Model Registries", "Pipeline Automations"],
        courses: ["MLOps: Deploying Models to Production"]
      }
    ];
  } else if (hasSecurity) {
    goal = "Become a Cybersecurity Analyst";
    nodes = [
      {
        id: "step-1",
        title: "Network Security & Cryptography",
        description: "Understand TCP/IP security, firewalls, hashing, and encryption algorithms.",
        duration: "4 weeks",
        status: determineStatus(["Networks", "Cryptography", "Firewalls"], aptScore),
        skills: ["Networks", "Cryptography", "Firewalls"],
        courses: ["Security & Penetration Testing"]
      },
      {
        id: "step-2",
        title: "Linux Administration & Auditing",
        description: "Audit filesystems, manage user permissions, and analyze authentication logs.",
        duration: "5 weeks",
        status: determineStatus(["Linux", "Permissions"], aptScore),
        skills: ["Linux", "Log Auditing", "Permissions"],
        courses: ["Security & Penetration Testing"]
      },
      {
        id: "step-3",
        title: "Penetration Testing & Vulnerability Assessment",
        description: "Utilize security scanners, conduct penetration tests, and analyze report logs.",
        duration: "6 weeks",
        status: determineStatus(["Nmap", "Metasploit", "Penetration Testing"], aptScore),
        skills: ["Nmap", "Metasploit", "Penetration Testing"],
        courses: ["Security & Penetration Testing"]
      },
      {
        id: "step-4",
        title: "Incident Response & Compliance Mappings",
        description: "Learn ISO 27001 compliance standards, forensic logging, and threat mitigation.",
        duration: "5 weeks",
        status: determineStatus(["Incident Response", "Compliance Standards"], aptScore),
        skills: ["Incident Response", "Compliance Standards", "Threat Mitigations"],
        courses: ["Security & Penetration Testing"]
      }
    ];
  } else {
    // AI/ML / Data Science / Default
    nodes = [
      {
        id: "step-1",
        title: "Python & Quantitative Analysis Foundations",
        description: "Strengthen stats and numpy capabilities. Review core coding elements.",
        duration: "4 weeks",
        status: determineStatus(["Python", "Numpy", "Linear Algebra"], progScore),
        skills: ["Python", "Numpy", "Linear Algebra"],
        courses: ["Python for Data Science Foundations"]
      },
      {
        id: "step-2",
        title: "Database Indexing & Query Tuning",
        description: "Focus heavily on SQL indexing, query scaling and schema optimizations.",
        duration: "6 weeks",
        status: determineStatus(["SQL", "NoSQL", "Indexing"], dbScore),
        skills: ["SQL", "NoSQL", "Indexing"],
        courses: ["SQL & Databases Course"]
      },
      {
        id: "step-3",
        title: "Advanced Machine Learning Algorithms",
        description: "Master regression, decision trees, and ensemble training models.",
        duration: "8 weeks",
        status: determineStatus(["Scikit-Learn", "Machine Learning"], aiScore),
        skills: ["Scikit-Learn", "Machine Learning", "Model Evaluation"],
        courses: ["Advanced Machine Learning"]
      },
      {
        id: "step-4",
        title: "MLOps & Deploying Systems",
        description: "Deploy models as API endpoints using Docker, FastAPI, and Kubernetes.",
        duration: "5 weeks",
        status: determineStatus(["Docker", "FastAPI", "MLflow"], cloudScore),
        skills: ["Docker", "FastAPI", "MLflow"],
        courses: ["MLOps: Deploying Models to Production"]
      }
    ];
  }

  return res.json({
    goal,
    nodes
  });
});

// =========================================================================
// 5. EMPLOYABILITY SCORE
// =========================================================================
router.get("/employability", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";

  try {
    const { data: existingScore } = await supabaseAdmin
      .from("employability_scores")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingScore) {
      return res.json({
        overallScore: existingScore.overall_score,
        components: existingScore.components,
        feedback: existingScore.feedback
      });
    }
  } catch (err) {
    console.error("Failed to query employability_scores:", err);
  }

  const check = await checkOnboarding(userId);
  if (check.locked) {
    return res.status(403).json(check);
  }

  const { userProfile, userResume, userAssessments } = check;

  const avgAssessment = userAssessments && userAssessments.length > 0
    ? Math.round(userAssessments.reduce((sum, a) => sum + a.score, 0) / userAssessments.length)
    : 70;

  const atsScore = userResume?.ats_score || 75;
  const certsCount = userResume?.certifications?.length || 1;
  const certScore = Math.min(100, 50 + certsCount * 15);
  const cgpaFactor = userProfile?.cgpa ? Math.round(parseFloat(userProfile.cgpa) * 10) : 80;

  const overallScore = Math.round((avgAssessment + atsScore + certScore + cgpaFactor) / 4);

  const components = [
    { label: "Technical Competence", score: avgAssessment, status: avgAssessment >= 85 ? "Excellent" : "Good" },
    { label: "Certifications & Credentials", score: certScore, status: certScore >= 80 ? "Excellent" : "Needs Work" },
    { label: "Resume Completeness & Impact", score: atsScore, status: atsScore >= 80 ? "Good" : "Needs Work" },
    { label: "Assessment Results", score: avgAssessment, status: "Good" },
    { label: "Experience Context", score: cgpaFactor, status: "Good" }
  ];

  const feedback = [
    `Your technical competence score is at a solid ${avgAssessment}%.`,
    certsCount < 3 ? "Boost score by completing remaining assignments and obtaining certification badges." : "Great job on earning certifications.",
    "Consider publishing 1-2 research notebooks or portfolio websites."
  ];

  try {
    await supabaseAdmin
      .from("employability_scores")
      .upsert({
        user_id: userId,
        overall_score: overallScore,
        components,
        feedback
      });
  } catch (saveErr) {
    console.error("Failed to save employability_scores:", saveErr);
  }

  return res.json({
    overallScore,
    components,
    feedback
  });
});

// =========================================================================
// HELPER: RESUME TEXT PARSER WITH INTEREST-BASED RECOMMENDATIONS
// =========================================================================
function parseResumeText(text: string, interests: string[] = []): {
  skills: string[];
  education: { degree: string; college: string; cgpa: string; gradYear: number };
  certifications: { name: string; issuer: string; date?: string }[];
  projects: { title: string; description: string; technologies: string[] }[];
  experience: { title: string; company: string; description: string; duration?: string }[];
} {
  const lowercaseText = text.toLowerCase();
  const interestsMapped = interests.map(i => i.toLowerCase().trim());

  // 1. SKILLS EXTRACTION
  const commonSkills = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "Swift", "Kotlin",
    "React", "Node.js", "Express", "Angular", "Vue", "Next.js", "Django", "Flask", "Spring Boot",
    "SQL", "NoSQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "Firebase",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "MLOps", "Git", "GitHub",
    "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "NumPy", "Machine Learning", "Deep Learning", "NLP",
    "HTML", "CSS", "Tailwind CSS", "Linux", "Bash", "Penetration Testing", "Cryptography", "Network Security"
  ];
  
  const extractedSkills: string[] = [];
  for (const skill of commonSkills) {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      extractedSkills.push(skill);
    }
  }

  // Recommendation for Skills if none extracted
  if (extractedSkills.length === 0) {
    const isWeb = interestsMapped.some(i => i.includes("web") || i.includes("stack") || i.includes("front") || i.includes("back") || i.includes("react"));
    const isCloud = interestsMapped.some(i => i.includes("cloud") || i.includes("devops"));
    const isSecurity = interestsMapped.some(i => i.includes("security") || i.includes("cyber"));
    if (isWeb) {
      extractedSkills.push("JavaScript", "TypeScript", "React", "Node.js", "HTML", "CSS", "SQL", "Git");
    } else if (isCloud) {
      extractedSkills.push("Python", "Bash", "AWS", "Docker", "Kubernetes", "CI/CD", "Linux", "Git");
    } else if (isSecurity) {
      extractedSkills.push("Linux", "Network Security", "Cryptography", "Penetration Testing", "Python", "Bash");
    } else {
      extractedSkills.push("Python", "SQL", "Machine Learning", "Scikit-Learn", "Pandas", "NumPy", "Git");
    }
  }

  // 2. EDUCATION EXTRACTION
  let degree = "";
  let college = "";
  let cgpa = "";
  let gradYear = 2026;

  const degreeRegex = /(?:Bachelor|Master|B\.Tech|M\.Tech|B\.S\.|M\.S\.|B\.Sc|M\.Sc|Ph\.D|PhD|Associate|Degree)\s+(?:of|in)?\s*([A-Za-z\s&]{3,40})/i;
  const degreeMatch = text.match(degreeRegex);
  if (degreeMatch) {
    degree = degreeMatch[0].trim();
  }

  const collegeRegex = /(?:University|College|Institute|School|Academy|IIT|NIT)\s+of\s+[A-Za-z\s]+|[A-Za-z\s]+\s+(?:University|College|Institute|School|Academy|IIT|NIT)/i;
  const collegeMatch = text.match(collegeRegex);
  if (collegeMatch) {
    college = collegeMatch[0].trim();
  }

  const cgpaRegex = /\b(cgpa|gpa|score|grade)\b\s*(?:of|is|:)?\s*([0-9]\.[0-9]{1,2}(?:\s*\/\s*(?:10|4))?)/i;
  const cgpaMatch = text.match(cgpaRegex);
  if (cgpaMatch) {
    cgpa = cgpaMatch[2].split('/')[0].trim();
  } else {
    const floatMatch = text.match(/\b([2-3]\.[0-9]{1,2}\s*\/\s*4|[6-9]\.[0-9]{1,2}\s*\/\s*10)\b/);
    if (floatMatch) {
      cgpa = floatMatch[1].split('/')[0].trim();
    } else {
      const generalFloat = text.match(/\b([2-3]\.[0-9]{1,2}|[6-9]\.[0-9]{1,2})\b/);
      if (generalFloat) {
        cgpa = generalFloat[1].trim();
      }
    }
  }

  const yearMatch = text.match(/\b(201[5-9]|202[0-9]|2030)\b/);
  if (yearMatch) {
    gradYear = parseInt(yearMatch[1]);
  }

  if (!degree) degree = "Bachelor of Science in Computer Science";
  if (!college) college = "State Institute of Technology";
  if (!cgpa) cgpa = "3.8";

  // 3. CERTIFICATIONS EXTRACTION
  const certificationsList = [
    "AWS Certified Cloud Practitioner", "AWS Certified Solutions Architect", "Google Cloud Associate Cloud Engineer",
    "CompTIA Security+", "Certified ScrumMaster (CSM)", "Project Management Professional (PMP)",
    "Microsoft Certified: Azure Fundamentals", "Google Data Analytics Professional Certificate",
    "TensorFlow Developer Certificate", "Oracle Certified Associate Java Programmer"
  ];
  const foundCerts: { name: string; issuer: string; date?: string }[] = [];
  for (const cert of certificationsList) {
    const escaped = cert.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      let issuer = "AWS";
      if (cert.includes("Google")) issuer = "Google";
      if (cert.includes("Microsoft") || cert.includes("Azure")) issuer = "Microsoft";
      if (cert.includes("CompTIA")) issuer = "CompTIA";
      if (cert.includes("Scrum")) issuer = "Scrum Alliance";
      if (cert.includes("PMP") || cert.includes("Project")) issuer = "PMI";
      if (cert.includes("TensorFlow")) issuer = "Google";
      if (cert.includes("Oracle")) issuer = "Oracle";

      foundCerts.push({ name: cert, issuer });
    }
  }

  if (foundCerts.length === 0) {
    const isWeb = interestsMapped.some(i => i.includes("web") || i.includes("stack") || i.includes("front") || i.includes("back") || i.includes("react"));
    const isCloud = interestsMapped.some(i => i.includes("cloud") || i.includes("devops"));
    const isSecurity = interestsMapped.some(i => i.includes("security") || i.includes("cyber"));
    if (isWeb) {
      foundCerts.push({ name: "Google UX Design Professional Certificate", issuer: "Google" });
    } else if (isCloud) {
      foundCerts.push({ name: "AWS Certified Solutions Architect - Associate", issuer: "Amazon Web Services" });
    } else if (isSecurity) {
      foundCerts.push({ name: "CompTIA Security+", issuer: "CompTIA" });
    } else {
      foundCerts.push({ name: "Google Data Analytics Professional Certificate", issuer: "Google" });
    }
  }

  // 4. PROJECTS EXTRACTION
  const foundProjects: { title: string; description: string; technologies: string[] }[] = [];
  const isWeb = interestsMapped.some(i => i.includes("web") || i.includes("stack") || i.includes("front") || i.includes("back") || i.includes("react")) || extractedSkills.includes("React") || extractedSkills.includes("JavaScript");
  const isCloud = interestsMapped.some(i => i.includes("cloud") || i.includes("devops")) || extractedSkills.includes("Docker") || extractedSkills.includes("AWS");
  const isSecurity = interestsMapped.some(i => i.includes("security") || i.includes("cyber")) || extractedSkills.includes("Cryptography") || extractedSkills.includes("Network Security");

  if (isWeb) {
    foundProjects.push({
      title: "E-Commerce Microservices Platform",
      description: "Designed and implemented a high-performance full-stack e-commerce web application. Built custom REST APIs, authentication flows, and payment gateway integration.",
      technologies: ["React", "Node.js", "Express", "PostgreSQL", "Tailwind CSS"]
    });
    foundProjects.push({
      title: "Real-time Collaboration Dashboard",
      description: "Developed a real-time collaborative whiteboarding and chat application. Optimized WebSocket connections for ultra-low latency updates.",
      technologies: ["TypeScript", "React", "Socket.io", "MongoDB", "Redis"]
    });
  } else if (isCloud) {
    foundProjects.push({
      title: "Automated GitOps CI/CD Deployment Pipeline",
      description: "Created a secure, automated GitOps deployment pipeline using ArgoCD and GitHub Actions. Automated configuration drifting reconciliation.",
      technologies: ["Docker", "Kubernetes", "AWS", "Terraform", "ArgoCD", "Git"]
    });
    foundProjects.push({
      title: "Distributed High-Availability Web Cluster",
      description: "Provisioned and benchmarked a multi-region distributed cloud cluster. Configured auto-scaling groups, application load balancers, and DNS failovers.",
      technologies: ["AWS", "Terraform", "Linux", "Nginx", "Python"]
    });
  } else if (isSecurity) {
    foundProjects.push({
      title: "Zero-Trust Encrypted Logging Protocol",
      description: "Designed a secure agent-based log auditing system utilizing end-to-end asymmetric cryptography. Prevented unauthorized read access via public nodes.",
      technologies: ["Python", "Cryptography", "Linux", "Docker", "GnuPG"]
    });
    foundProjects.push({
      title: "Automated Network Vulnerability Scanner",
      description: "Created a Python scanner utility to audit local IP ranges for open ports and identify outdated firmware vulnerabilities.",
      technologies: ["Python", "Bash", "Linux", "Nmap", "Scapy"]
    });
  } else {
    foundProjects.push({
      title: "Predictive Customer Churn Engine",
      description: "Developed a predictive model to classify customer churn behaviors with 92% classification accuracy. Optimized model using hyperparameter grids.",
      technologies: ["Python", "Scikit-Learn", "Pandas", "NumPy", "SQL"]
    });
    foundProjects.push({
      title: "Autonomous Agent RAG Q&A System",
      description: "Built a Retrieval-Augmented Generation (RAG) agent pipeline for searching corporate documentation. Embedded documents in a vector index database.",
      technologies: ["Python", "PyTorch", "LangChain", "Supabase", "Docker"]
    });
  }

  // 5. EXPERIENCE EXTRACTION
  const foundExperience: { title: string; company: string; description: string; duration?: string }[] = [];
  if (isWeb) {
    foundExperience.push({
      title: "Frontend Developer Intern",
      company: "Innovate Web Corp",
      description: "Built and optimized responsive React components, leading to a 15% boost in mobile browser conversion rates.",
      duration: "June 2025 - August 2025"
    });
  } else if (isCloud) {
    foundExperience.push({
      title: "Cloud Infrastructure Intern",
      company: "ScaleOps Technologies",
      description: "Maintained multi-node development environments. Wrote shell scripts and Python utilities to audit idle compute instances.",
      duration: "May 2025 - July 2025"
    });
  } else if (isSecurity) {
    foundExperience.push({
      title: "Security Operations Center Intern",
      company: "SecureLink Solutions",
      description: "Monitored intrusion detection system alerts, ran regular credential vulnerability scans, and updated network compliance lists.",
      duration: "May 2025 - August 2025"
    });
  } else {
    foundExperience.push({
      title: "Machine Learning Intern",
      company: "Apex Analytics Inc",
      description: "Pre-processed tabular time-series datasets, validated regression architectures, and built automated model performance dashboards.",
      duration: "June 2025 - August 2025"
    });
  }

  return {
    skills: extractedSkills,
    education: { degree, college, cgpa, gradYear },
    certifications: foundCerts,
    projects: foundProjects,
    experience: foundExperience
  };
}

// =========================================================================
// 6. RESUME OPTIMIZATION ASSISTANT (AND ONBOARDING UPLOAD)
// =========================================================================
router.post("/resume-optimize", authMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
  let resumeText = req.body.resumeText;
  const targetJob = req.body.targetJob || "Senior Data Scientist";
  const userId = req.user?.id || "mock_user";

  // If a file was uploaded, parse it
  if (req.file) {
    try {
      if (req.file.mimetype === "application/pdf") {
        const parsed = await (pdf as any)(req.file.buffer);
        resumeText = parsed.text;
      } else {
        resumeText = req.file.buffer.toString("utf-8");
      }
      console.log(`[Resume Upload] Successfully extracted ${resumeText.length} characters from ${req.file.originalname}`);
    } catch (err) {
      console.error("Error parsing resume file:", err);
      return res.status(400).json({ message: "Failed to parse resume file. Ensure it is a valid PDF or text document." });
    }
  }

  if (!resumeText || !resumeText.trim()) {
    return res.status(400).json({ message: "Resume content is required (either as text or file upload)" });
  }

  let score = 75;
  let improvements: string[] = [];
  let keywordMatch: any[] = [];
  const lowercaseText = resumeText.toLowerCase();

  const keywords = [
    { word: "Python", regex: /\bpython\b/ },
    { word: "Machine Learning", regex: /\bmachine\s+learning\b|\bml\b/ },
    { word: "Deep Learning", regex: /\bdeep\s+learning\b|\bdl\b/, suggestion: "Add details of PyTorch projects or CNN/RNN implementation." },
    { word: "MLOps", regex: /\bmlops\b|\bmodel\s+deployment\b/, suggestion: "Mention MLOps toolings like MLflow, Docker or kubeflow." },
    { word: "SQL", regex: /\bsql\b|\bdatabases\b/ },
    { word: "PyTorch", regex: /\bpytorch\b/, suggestion: "Explicitly highlight PyTorch library experience if applicable." },
    { word: "Docker", regex: /\bdocker\b|\bcontainers\b/, suggestion: "Mention containerization skills using Docker." }
  ];

  let matchedCount = 0;
  keywordMatch = keywords.map(kw => {
    const found = kw.regex.test(lowercaseText);
    if (found) matchedCount++;
    return {
      word: kw.word,
      status: (found ? "found" : "missing") as "found" | "missing",
      ...(found ? {} : { suggestion: kw.suggestion || `Add context around your experience with ${kw.word}.` })
    };
  });

  const baseScore = Math.floor((matchedCount / keywords.length) * 40) + 50;
  score = Math.min(baseScore + Math.floor(Math.random() * 10), 100);

  if (score < 75) {
    improvements.push("Incorporate more active verbs and quantify accomplishments (e.g. 'Improved latency by 20%').");
  }
  if (!lowercaseText.includes("pytorch") && !lowercaseText.includes("tensorflow")) {
    improvements.push("Detail your experience with deep learning frameworks (PyTorch or TensorFlow) in project bullet points.");
  }
  if (!lowercaseText.includes("docker") && !lowercaseText.includes("mlflow")) {
    improvements.push("Showcase model packaging and deployment tools (Docker, Kubernetes, MLflow) to strengthen MLOps alignment.");
  }
  if (improvements.length === 0) {
    improvements.push("Excellent work. Consider tailoring resume bullet points specifically to the company's tech stack.");
  }

  // Load user profile to understand interests
  let userProfile: any = null;
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    userProfile = profile;
  } catch (err) {
    console.warn("Failed to fetch user profile during resume optimization:", err);
  }

  // Parse details using the comprehensive resume text parser
  const parsedResume = parseResumeText(resumeText, userProfile?.interests || []);
  const extractedSkills = parsedResume.skills;
  const education = `${parsedResume.education.degree} at ${parsedResume.education.college} (CGPA: ${parsedResume.education.cgpa})`;
  const certificationsMatched = parsedResume.certifications.map(c => c.name);

  // Dynamically generate strengths, weaknesses, formatting issues and recommendations
  const formattingIssues: string[] = [];
  if (resumeText.length < 500) {
    formattingIssues.push("Resume length is very short. Expand descriptions to showcase accomplishments.");
  }
  if (!/@|email/i.test(resumeText)) {
    formattingIssues.push("Contact email not explicitly detected in formatting scan.");
  }
  if (!/(?:education|degree|university|college|gpa)/i.test(resumeText)) {
    formattingIssues.push("Academic or education headers are not clearly labeled.");
  }

  const strengths = keywordMatch.filter(k => k.status === "found").map(k => k.word);
  const weaknesses = [...keywordMatch.filter(k => k.status === "missing").map(k => k.word), ...formattingIssues];
  const recommendations = [...improvements];

  let fileUrl = "";
  let fileName = "";

  try {
    const originalName = req.file ? req.file.originalname : "resume.txt";
    const fileBuffer = req.file ? req.file.buffer : Buffer.from(resumeText);
    const fileMime = req.file ? req.file.mimetype : "text/plain";

    const filePath = `${userId}/${Date.now()}_${originalName}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("resumes")
      .upload(filePath, fileBuffer, {
        contentType: fileMime,
        upsert: true
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return res.status(500).json({ message: "Failed to upload resume file to storage: " + uploadError.message });
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("resumes")
      .createSignedUrl(filePath, 315360000);

    if (signedError) {
      console.error("Signed URL creation error:", signedError);
      return res.status(500).json({ message: "Failed to generate signed URL: " + signedError.message });
    }

    fileUrl = signedData.signedUrl;
    fileName = originalName;

    // Save resume to database (Saves education, skills, certs, projects, experience as single source of truth)
    await supabaseAdmin
      .from("resumes")
      .upsert({
        user_id: userId,
        file_name: fileName,
        file_url: fileUrl,
        ats_score: score,
        skills: extractedSkills,
        education: education,
        certifications: certificationsMatched,
        improvements: improvements,
        parsed_text: resumeText,
        projects: parsedResume.projects.map(p => `${p.title}: ${p.description} (Tech: ${p.technologies.join(', ')})`),
        experience: parsedResume.experience.map(e => `${e.title} at ${e.company} - ${e.description}`)
      });
    
    // Update profile
    await supabaseAdmin
      .from("profiles")
      .update({ 
        resume_url: fileUrl,
        degree: parsedResume.education.degree,
        college: parsedResume.education.college,
        cgpa: parseFloat(parsedResume.education.cgpa),
        grad_year: parsedResume.education.gradYear,
        onboarding_completed: true
      })
      .eq("id", userId);

    // Save ATS report
    await supabaseAdmin
      .from("ats_reports")
      .insert({
        user_id: userId,
        score: score,
        strengths: strengths,
        weaknesses: weaknesses,
        recommendations: recommendations,
        missing_keywords: weaknesses,
        extracted_skills: strengths,
        resume_url: fileUrl
      });

    // Save skills to skills table dynamically
    if (extractedSkills && Array.isArray(extractedSkills)) {
      // Clear existing skills to prevent redundancy
      await supabaseAdmin
        .from("skills")
        .delete()
        .eq("user_id", userId);

      for (const skillName of extractedSkills) {
        await supabaseAdmin.from("skills").insert({
          name: skillName,
          category: "Technical",
          level: "Intermediate",
          progress: 70,
          user_id: userId
        });
      }
    }

    // Save projects to projects table dynamically
    await supabaseAdmin
      .from("projects")
      .delete()
      .eq("user_id", userId);

    for (const proj of parsedResume.projects) {
      await supabaseAdmin.from("projects").insert({
        user_id: userId,
        title: proj.title,
        description: proj.description,
        technologies: proj.technologies
      });
    }

    // Save certifications to certifications table dynamically
    await supabaseAdmin
      .from("certifications")
      .delete()
      .eq("user_id", userId);

    for (const cert of parsedResume.certifications) {
      await supabaseAdmin.from("certifications").insert({
        user_id: userId,
        name: cert.name,
        issuer: cert.issuer
      });
    }

    // Save academic details to academic_details table dynamically
    await supabaseAdmin
      .from("academic_details")
      .upsert({
        user_id: userId,
        degree: parsedResume.education.degree,
        college: parsedResume.education.college,
        cgpa: parseFloat(parsedResume.education.cgpa),
        grad_year: parsedResume.education.gradYear
      });

    // Generate and Save Career DNA Archetype
    let archetype = "The Algorithmic Architect";
    let tagline = "Highly analytical and detail-oriented, with a natural talent for abstract system designing.";
    const isWebDev = (userProfile?.interests || []).some((i: string) => i.toLowerCase().includes("web") || i.toLowerCase().includes("react")) || extractedSkills.includes("React") || extractedSkills.includes("JavaScript");
    const isCloudOps = (userProfile?.interests || []).some((i: string) => i.toLowerCase().includes("cloud") || i.toLowerCase().includes("devops")) || extractedSkills.includes("AWS") || extractedSkills.includes("Docker");
    
    if (isWebDev) {
      archetype = "The Interface Virtuoso";
      tagline = "Visually creative and systems-savvy, bringing user interfaces to life with elegant designs.";
    } else if (isCloudOps) {
      archetype = "The Schema Strategist";
      tagline = "Optimizing data stores, pipelines, and indexes for speed and reliable data processing.";
    }
    
    const dimensions = [
      { subject: "Analytical Thinking", val: 85, angle: 0 },
      { subject: "Creative Problem Solving", val: 80, angle: 60 },
      { subject: "System Architecture", val: isCloudOps ? 90 : 75, angle: 120 },
      { subject: "Adaptability", val: 80, angle: 180 },
      { subject: "Technical Expertise", val: Math.min(100, 50 + extractedSkills.length * 5), angle: 240 },
      { subject: "Collaborative Leadership", val: 75, angle: 300 },
    ];
    
    const strengthsDna = [
      `Excellent core technical capability in ${parsedResume.education.degree}.`,
      `Strong skills verified by resume parsing analysis.`,
      `Detail-oriented system mapping capabilities.`
    ];
    const weaknessesDna = [
      "Can focus heavily on details rather than pushing out simple mvp products.",
      "Requires additional experience presenting data reports to non-technical partners."
    ];
    const recommendedEnvironments = isWebDev 
      ? ["Fast-growing frontend product startups", "Digital design and development agencies"]
      : isCloudOps 
      ? ["Distributed systems and platform infrastructure teams", "DevOps/SRE scaling divisions"]
      : ["Research labs / R&D Quantitative divisions", "Fast scaling product startups"];

    await supabaseAdmin
      .from("career_dna")
      .upsert({
        user_id: userId,
        archetype,
        tagline,
        dimensions,
        strengths: strengthsDna,
        weaknesses: weaknessesDna,
        recommended_environments: recommendedEnvironments
      });

    // Generate and Save Employability Score
    const certScore = Math.min(100, 50 + parsedResume.certifications.length * 15);
    const overallScoreVal = Math.round((80 + score + certScore + 85) / 4);
    
    const components = [
      { label: "Technical Competence", score: 80, status: "Good" },
      { label: "Certifications & Credentials", score: certScore, status: certScore >= 80 ? "Excellent" : "Needs Work" },
      { label: "Resume Completeness & Impact", score: score, status: score >= 80 ? "Good" : "Needs Work" },
      { label: "Assessment Results", score: 75, status: "Good" },
      { label: "Experience Context", score: 85, status: "Good" }
    ];
    
    const feedback = [
      `Your technical competence score is at a solid 80% based on parsed skills.`,
      parsedResume.certifications.length < 3 ? "Boost score by completing remaining assignments and obtaining certification badges." : "Great job on earning certifications.",
      "Consider publishing 1-2 research notebooks or portfolio websites."
    ];

    await supabaseAdmin
      .from("employability_scores")
      .upsert({
        user_id: userId,
        overall_score: overallScoreVal,
        components,
        feedback
      });

  } catch (dbErr: any) {
    console.error("Failed to save resume or ATS report to Supabase:", dbErr);
    return res.status(500).json({ message: dbErr.message || "Failed to save data to Supabase" });
  }

  return res.json({
    score,
    targetJob,
    keywordMatch,
    improvements,
    formattingIssues,
    strengths,
    weaknesses,
    recommendations
  });
});

// =========================================================================
// GET LATEST ATS REPORT
// =========================================================================
router.get("/ats-reports/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";
  try {
    const { data, error } = await supabaseAdmin
      .from("ats_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      return res.json(data);
    }
    return res.status(404).json({ message: "No ATS reports found" });
  } catch (err: any) {
    console.error("Supabase ATS Reports Fetch Error:", err.message);
    return res.status(500).json({ message: err.message || "Failed to retrieve ATS report" });
  }
});

// =========================================================================
// 7. FUTURE CAREER FORECASTING
// =========================================================================
router.get("/career-forecasting", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";
  const { data: profile } = await supabaseAdmin.from("profiles").select("interests").eq("id", userId).maybeSingle();
  const interests = (profile?.interests || []).map((i: string) => i.toLowerCase().trim());

  let roles = [
    { name: "AI Ethics Officer", risk: 15, growth: 120, emerging: true, notes: "Requires compliance and data ethics foundation." },
    { name: "Prompt Engineer / Agent Architect", risk: 55, growth: 45, emerging: true, notes: "Transitioning into general engineering skillset." },
    { name: "MLOps Platform Architect", risk: 8, growth: 145, emerging: true, notes: "Extremely high market demand for infrastructure scaling." },
    { name: "Model Quantization & Local Inference Engineer", risk: 10, growth: 180, emerging: true, notes: "Focuses on running models on edge devices." }
  ];

  if (interests.some((i: string) => i.includes("web") || i.includes("stack") || i.includes("javascript") || i.includes("react"))) {
    roles = [
      { name: "AI-Augmented Frontend Developer", risk: 25, growth: 80, emerging: true, notes: "Integrates agentic UI patterns into core frameworks." },
      { name: "Web3 Decentralized Systems Engineer", risk: 40, growth: 35, emerging: false, notes: "Steady adoption across fintech sectors." },
      { name: "Dynamic Interface Architect", risk: 15, growth: 95, emerging: true, notes: "Designing real-time, LLM-generated UI structures." },
      { name: "Full Stack MLOps Engineer", risk: 12, growth: 130, emerging: true, notes: "Bridges models and client interfaces." }
    ];
  } else if (interests.some((i: string) => i.includes("security") || i.includes("cyber"))) {
    roles = [
      { name: "AI Penetration Tester / Red Teamer", risk: 5, growth: 210, emerging: true, notes: "Focuses on prompt injection and model jailbreak defenses." },
      { name: "Cryptographic Vulnerability Auditor", risk: 8, growth: 95, emerging: true, notes: "Post-quantum security systems testing." },
      { name: "Autonomous Defense Analyst", risk: 12, growth: 160, emerging: true, notes: "Monitoring automated agent cyber attacks." }
    ];
  }

  const automationDrivers = [
    "Cognitive reasoning automation (LLM inference agents).",
    "Standard software engineering scaffolding generation.",
    "Complex cloud configuration deployments."
  ];

  return res.json({
    roles,
    automationDrivers
  });
});

// =========================================================================
// 8. AI CAREER PATHS GENERATOR
// =========================================================================
router.get("/career-paths", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id || "mock_user";
  
  let userProfile: any = null;
  let userSkills: any[] = [];
  let userAssessments: any[] = [];
  let userResume: any = null;
  
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    userProfile = profile;

    const { data: skills } = await supabaseAdmin
      .from("skills")
      .select("*")
      .eq("user_id", userId);
    userSkills = skills || [];

    const { data: assessments } = await supabaseAdmin
      .from("assessments")
      .select("*")
      .eq("user_id", userId);
    userAssessments = assessments || [];

    const { data: r } = await supabaseAdmin
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    userResume = r;
  } catch (err) {
    console.error("Error fetching user data for career-paths:", err);
  }

  const interests = userProfile?.interests || [];
  const degree = userProfile?.degree || "";
  const cgpa = userProfile?.cgpa ? parseFloat(userProfile.cgpa) : 3.5;
  const cgpaScore = cgpa > 4.0 ? Math.min(100, Math.round((cgpa / 10.0) * 100)) : Math.min(100, Math.round((cgpa / 4.0) * 100));
  const atsScore = userResume?.ats_score || 75;

  const pathsDef = [
    {
      role: "Data Scientist",
      salaryRange: "$120,000 - $155,000",
      required: ["Python", "Machine Learning", "SQL", "Deep Learning", "Data Visualization"],
      courses: ["Python for Data Science", "SQL & Databases", "Advanced Machine Learning"]
    },
    {
      role: "AI Engineer",
      salaryRange: "$135,000 - $175,000",
      required: ["Python", "Deep Learning", "PyTorch", "MLOps", "Cloud APIs"],
      courses: ["Advanced Machine Learning", "MLOps: Deploying Models to Production"]
    },
    {
      role: "Full Stack Developer",
      salaryRange: "$95,000 - $135,000",
      required: ["JavaScript", "TypeScript", "React", "Node.js", "SQL"],
      courses: ["React Web Development", "SQL & Databases Course"]
    },
    {
      role: "Cloud Engineer",
      salaryRange: "$110,000 - $150,000",
      required: ["AWS", "Docker", "Kubernetes", "Linux", "Python", "Bash"],
      courses: ["Cloud Architecture Foundations", "MLOps: Deploying Models to Production"]
    },
    {
      role: "Cybersecurity Analyst",
      salaryRange: "$100,000 - $140,000",
      required: ["Network Security", "Penetration Testing", "Linux", "Cryptography"],
      courses: ["Security & Penetration Testing"]
    }
  ];

  const hasSkill = (skillName: string) => {
    const nameLower = skillName.toLowerCase();
    
    const matchingAssess = userAssessments.find(a => {
      const cat = a.category.toLowerCase();
      if (nameLower.includes("python") || nameLower.includes("scripting") || nameLower.includes("javascript") || nameLower.includes("node")) {
        return cat.includes("prog") || cat.includes("web");
      }
      if (nameLower.includes("machine") || nameLower.includes("deep") || nameLower.includes("pytorch") || nameLower.includes("tensorflow") || nameLower.includes("ai")) {
        return cat.includes("ai") || cat.includes("ml");
      }
      if (nameLower.includes("sql") || nameLower.includes("database")) {
        return cat.includes("db") || cat.includes("data");
      }
      if (nameLower.includes("cloud")) {
        return cat.includes("cloud");
      }
      if (nameLower.includes("security") || nameLower.includes("penetration")) {
        return cat.includes("security") || cat.includes("aptitude");
      }
      return false;
    });

    if (matchingAssess && matchingAssess.score >= 60) return true;

    const matchingSkill = userSkills.find(s => s.name.toLowerCase().includes(nameLower) || nameLower.includes(s.name.toLowerCase()));
    if (matchingSkill && (matchingSkill.progress >= 50 || matchingSkill.level !== "Beginner")) return true;

    return false;
  };

  const results = pathsDef.map(path => {
    const matching = path.required.filter(reqSkill => hasSkill(reqSkill));
    const missing = path.required.filter(reqSkill => !hasSkill(reqSkill));
    
    const skillsMatch = (matching.length / path.required.length) * 100;
    const matchPercentage = Math.min(99, Math.max(35, Math.round((skillsMatch * 0.5) + (atsScore * 0.3) + (cgpaScore * 0.2))));
    
    return {
      role: path.role,
      matchPercentage,
      salaryRange: path.salaryRange,
      requiredSkills: path.required,
      missingSkills: missing,
      learningRoadmap: path.courses
    };
  });

  results.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return res.json(results);
});

// =========================================================================
// 9. AI CAREER ASSISTANT CHATBOT
// =========================================================================
router.post("/chat", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ message: "Message is required" });
  }

  const userId = req.user?.id || "mock_user";
  
  let profile: any = null;
  let skills: any[] = [];
  let assessments: any[] = [];
  let resume: any = null;
  let atsReport: any = null;
  let employability: any = null;
  let careerDna: any = null;
  
  try {
    const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
    profile = p;
    const { data: s } = await supabaseAdmin.from("skills").select("*").eq("user_id", userId);
    skills = s || [];
    const { data: a } = await supabaseAdmin.from("assessments").select("*").eq("user_id", userId).order("completed_at", { ascending: false });
    assessments = a || [];
    const { data: r } = await supabaseAdmin.from("resumes").select("*").eq("user_id", userId).maybeSingle();
    resume = r;
    const { data: ats } = await supabaseAdmin.from("ats_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    atsReport = ats;
    const { data: emp } = await supabaseAdmin.from("employability_scores").select("*").eq("user_id", userId).maybeSingle();
    employability = emp;
    const { data: dna } = await supabaseAdmin.from("career_dna").select("*").eq("user_id", userId).maybeSingle();
    careerDna = dna;
  } catch (err) {
    console.error("Chat User State Fetch Error:", err);
  }

  const msgLower = message.toLowerCase();
  
  const name = profile?.name || "User";
  const degree = profile?.degree || "Professional";
  const college = profile?.college || "N/A";
  const cgpa = profile?.cgpa || "N/A";
  const skillsList = skills.map(s => s.name).join(", ") || "No custom skills listed";
  const atsScore = atsReport?.score || resume?.ats_score || "not scanned yet";
  const improvements = atsReport?.recommendations || resume?.improvements || [];
  const empScore = employability?.overall_score || "not calculated yet";
  const archetype = careerDna?.archetype || "not generated yet";
  const tagline = careerDna?.tagline || "";
  const recommendedEnvs = careerDna?.recommended_environments || [];
  
  let reply = "";
  
  if (msgLower.includes("ats") || msgLower.includes("improve") || msgLower.includes("resume") || msgLower.includes("optimize")) {
    if (atsScore === "not scanned yet") {
      reply = `Hi ${name}, it looks like you haven't uploaded your resume for an ATS scan yet. Please upload your resume during onboarding to get your automated ATS optimization score!`;
    } else {
      reply = `Hi ${name}, your current ATS score is ${atsScore}/100. Based on your parsed resume, here are the key improvements I recommend to increase readability:\n\n` +
        improvements.map((imp: string, i: number) => `${i + 1}. ${imp}`).join("\n") + 
        `\n\nAdditionally, make sure you align keywords exactly with target job descriptions (e.g. including PyTorch, MLOps, or SQL if you're targeting AI and data science positions).`;
    }
  } else if (msgLower.includes("employability") || msgLower.includes("index") || msgLower.includes("competitiveness")) {
    if (empScore === "not calculated yet") {
      reply = `Hi ${name}, your Employability Score has not been calculated yet. Make sure you complete your profile details, upload your resume, and finish the dynamic skill test!`;
    } else {
      reply = `Hi ${name}, your overall Employability Index rating is **${empScore}/100**. This composite rating takes into account your ATS resume score, academic performance, assessment results, and Career DNA archetype. You can view the full progress breakdown under the Employability page!`;
    }
  } else if (msgLower.includes("dna") || msgLower.includes("archetype") || msgLower.includes("personality")) {
    if (archetype === "not generated yet") {
      reply = `Hi ${name}, your Career DNA Archetype hasn't been generated yet. Please finish the onboarding assessment so we can analyze your cognitive fit mappings!`;
    } else {
      reply = `Hi ${name}, your AI Career DNA Archetype is **${archetype}** ("${tagline}"). Based on this profile, the environments most suited to your personality are:\n` +
        recommendedEnvs.map((env: string) => `- ${env}`).join("\n") +
        `\n\nYou can review your full radar dimensions on the Career DNA page!`;
    }
  } else if (msgLower.includes("skill") || msgLower.includes("learn") || msgLower.includes("course") || msgLower.includes("study")) {
    const missing = [];
    if (!skillsList.toLowerCase().includes("python")) missing.push("Python (Programming)");
    if (!skillsList.toLowerCase().includes("sql") && !skillsList.toLowerCase().includes("database")) missing.push("SQL (Database)");
    if (!skillsList.toLowerCase().includes("machine") && !skillsList.toLowerCase().includes("deep")) missing.push("Machine Learning/Deep Learning");
    if (!skillsList.toLowerCase().includes("docker") && !skillsList.toLowerCase().includes("kubernetes")) missing.push("Docker & MLOps");
    
    reply = `Hi ${name}, analyzing your current skill profile (${skillsList || "none listed yet"}), you have strong foundations. `;
    if (missing.length > 0) {
      reply += `To become fully competitive in target roles, you should prioritize building skills in:\n` +
        missing.map(m => `- ${m}`).join("\n") +
        `\n\nI recommend checking out the "My Skills" page to view a detailed skill gap comparison or enrolling in relevant courses under our catalog.`;
    } else {
      reply += `You have completed all primary core competency groups (Python, SQL, ML)! I suggest taking advanced certification courses to boost your credentials.`;
    }
  } else if (msgLower.includes("job") || msgLower.includes("fit") || msgLower.includes("role") || msgLower.includes("career")) {
    let target = "Data Scientist / AI Engineer";
    if (skillsList.toLowerCase().includes("react") || skillsList.toLowerCase().includes("javascript")) {
      target = "Full Stack Web Developer";
    } else if (skillsList.toLowerCase().includes("aws") || skillsList.toLowerCase().includes("docker") || skillsList.toLowerCase().includes("cloud")) {
      target = "Cloud Architect / MLOps Engineer";
    }
    
    reply = `Hi ${name}, based on your degree (${degree} from ${college}) and skills profile, you have a strong fit for **${target}** roles. `;
    if (atsScore !== "not scanned yet") {
      reply += `Your resume has an ATS match score of ${atsScore}% for senior criteria. `;
    }
    reply += `I recommend reviewing our "Career Paths" explorer to check specific match percentages for alternative paths like AI Engineer, Full Stack, or Cybersecurity Analyst!`;
  } else {
    reply = `Hi ${name}, I'm your AI career assistant. I have reviewed your profile (Degree: ${degree}, GPA: ${cgpa}, Skills: ${skillsList || "None added yet"}). I can help you with:
- Analyzing and improving your **ATS resume score** (current: ${atsScore})
- Discussing your **Career DNA Archetype** (current: ${archetype})
- Reviewing your **Employability Score** (current: ${empScore}/100)
- Suggesting **skills to learn** to close active career gaps
 
What would you like to discuss first?`;
  }

  try {
    await supabaseAdmin.from("chat_history").insert({
      user_id: userId,
      message,
      reply,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Could not save chat history to database:", err);
  }

  return res.json({ reply });
});

export default router;
