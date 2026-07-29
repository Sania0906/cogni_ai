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

    const resumeUploaded = !!resume;

    if (!resumeUploaded) {
      return {
        locked: true,
        message: "AI Career insights are locked. Please upload your resume first to unlock AI Analysis.",
        checklist: {
          profile: true,
          assessment: true,
          resume: false
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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

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
      return res.json({ categories: [], marketDrivers: [] });
    }

    const mapped = (categories || []).map(item => ({
      name: item.category,
      growth: Number(item.growth_rate),
      openings: item.openings_count,
      salary: Number(item.average_salary),
      trend: Number(item.growth_rate) >= 20 ? "up" : "stable"
    }));

    const marketDrivers = Array.from(new Set(categories.flatMap(item => item.market_drivers || [])));

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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

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
function parseResumeText(text: string): {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  skills: string[];
  education: { degree: string; college: string; cgpa: string; gradYear: number };
  certifications: { name: string; issuer: string; date?: string }[];
  projects: { title: string; description: string; technologies: string[] }[];
  experience: { title: string; company: string; description: string; duration?: string }[];
  languages: string[];
} {
  const lowercaseText = text.toLowerCase();
  
  // 1. EXTRACT CONTACT INFO
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : "";
  
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch ? phoneMatch[0] : "";
  
  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
  const linkedin = linkedinMatch ? `https://www.${linkedinMatch[0]}` : "";
  
  const githubMatch = text.match(/github\.com\/[a-zA-Z0-9_-]+/i);
  const github = githubMatch ? `https://${githubMatch[0]}` : "";
  
  const portfolioMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:dev|me|io|com)(?:\/[a-zA-Z0-9_-]+)*)/i);
  const portfolio = portfolioMatch && !portfolioMatch[0].includes("linkedin") && !portfolioMatch[0].includes("github") ? portfolioMatch[0] : "";

  // 2. SKILLS EXTRACTION
  const commonSkills = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "Swift", "Kotlin",
    "React", "Node.js", "Express", "Angular", "Vue", "Next.js", "Django", "Flask", "Spring Boot",
    "SQL", "NoSQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "Firebase",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "MLOps", "Git", "GitHub",
    "PyTorch", "TensorFlow", "Scikit-Learn", "Pandas", "NumPy", "Machine Learning", "Deep Learning", "NLP",
    "HTML", "CSS", "Tailwind CSS", "Linux", "Bash", "GraphQL", "REST API", "Microservices"
  ];
  
  const extractedSkills: string[] = [];
  for (const skill of commonSkills) {
    const escaped = skill.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      extractedSkills.push(skill);
    }
  }

  // 3. EDUCATION EXTRACTION
  let degree = "";
  let college = "";
  let cgpa = "";
  let gradYear = new Date().getFullYear();

  const degreeRegex = /(?:Bachelor|Master|B\.Tech|M\.Tech|B\.S\.|M\.S\.|B\.Sc|M\.Sc|Ph\.D|PhD|Associate|Degree)\s+(?:of|in)?\s*([A-Za-z\s&]{3,40})/i;
  const degreeMatch = text.match(degreeRegex);
  if (degreeMatch) degree = degreeMatch[0].trim();

  const collegeRegex = /(?:University|College|Institute|School|Academy|IIT|NIT)\s+of\s+[A-Za-z\s]+|[A-Za-z\s]+\s+(?:University|College|Institute|School|Academy|IIT|NIT)/i;
  const collegeMatch = text.match(collegeRegex);
  if (collegeMatch) college = collegeMatch[0].trim();

  const cgpaRegex = /\b(cgpa|gpa|score|grade)\b\s*(?:of|is|:)?\s*([0-9]\.[0-9]{1,2}(?:\s*\/\s*(?:10|4))?)/i;
  const cgpaMatch = text.match(cgpaRegex);
  if (cgpaMatch) {
    cgpa = cgpaMatch[2].split('/')[0].trim();
  } else {
    const floatMatch = text.match(/\b([2-3]\.[0-9]{1,2}\s*\/\s*4|[6-9]\.[0-9]{1,2}\s*\/\s*10)\b/);
    if (floatMatch) cgpa = floatMatch[1].split('/')[0].trim();
  }

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) gradYear = parseInt(yearMatch[0]);

  // 4. CERTIFICATIONS
  const certificationsList = [
    "AWS Certified", "Google Cloud", "CompTIA", "ScrumMaster", "PMP", "Cisco",
    "Azure Fundamentals", "Data Analytics Professional", "TensorFlow Developer"
  ];
  const foundCerts: { name: string; issuer: string }[] = [];
  certificationsList.forEach(cert => {
    if (new RegExp(cert, 'i').test(text)) {
      foundCerts.push({ name: cert, issuer: "Tech Certification Board" });
    }
  });

  // 5. PROJECTS & EXPERIENCE (HEURISTIC)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const foundProjects: { title: string; description: string; technologies: string[] }[] = [];
  const foundExperience: { title: string; company: string; description: string; duration?: string }[] = [];
  
  let currentSection = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (line.includes("experience") || line.includes("employment")) currentSection = "exp";
    else if (line.includes("project")) currentSection = "proj";
    else if (line.includes("education")) currentSection = "edu";
    else if (line.includes("skill")) currentSection = "skills";
    else {
      // Heuristic extraction
      if (currentSection === "exp" && (line.includes("intern") || line.includes("engineer") || line.includes("developer") || line.includes("manager"))) {
        foundExperience.push({
          title: lines[i],
          company: lines[i+1] || "Company",
          description: lines[i+2] || "Detailed work description.",
          duration: lines[i].match(/\b(20\d{2})\b/) ? "Recent" : "Present"
        });
        i += 2; // skip parsed lines
      } else if (currentSection === "proj" && lines[i].length > 10 && lines[i].length < 50) {
        foundProjects.push({
          title: lines[i],
          description: lines[i+1] || "Project description.",
          technologies: extractedSkills.slice(0, 3)
        });
        i++;
      }
    }
  }

  // Name extraction (heuristic: first non-empty line without contact info)
  let name = "Professional User";
  for (const line of lines) {
    if (line.length > 2 && line.length < 30 && !line.includes("@") && !line.includes("http")) {
      name = line;
      break;
    }
  }

  // 6. LANGUAGES
  const languageList = ["English", "Spanish", "French", "German", "Mandarin", "Hindi", "Arabic", "Portuguese", "Russian", "Japanese"];
  const languages = languageList.filter(l => new RegExp(`\\b${l}\\b`, 'i').test(text));

  return {
    name, email, phone, linkedin, github, portfolio,
    skills: extractedSkills,
    education: { degree, college, cgpa, gradYear },
    certifications: foundCerts,
    projects: foundProjects,
    experience: foundExperience,
    languages
  };
}

// =========================================================================
// 6. RESUME OPTIMIZATION ASSISTANT (AND ONBOARDING UPLOAD)
// =========================================================================
router.post("/resume-optimize", authMiddleware, upload.single("file"), async (req: AuthRequest, res: Response) => {
  let resumeText = req.body.resumeText;
  const targetJob = req.body.targetJob || "Senior Data Scientist";
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

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

  let calculatedScore = Math.round((matchedCount / keywords.length) * 80);
  if (/@|email/i.test(resumeText)) calculatedScore += 10;
  if (/(?:education|degree|university|college|gpa)/i.test(resumeText)) calculatedScore += 10;
  score = Math.min(100, Math.max(30, calculatedScore));

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
    // Parse details using the comprehensive dynamic resume text parser
    const parsedResume = parseResumeText(resumeText);
    const extractedSkills = parsedResume.skills;
    const education = `${parsedResume.education.degree} at ${parsedResume.education.college} (CGPA: ${parsedResume.education.cgpa})`;
    const certificationsMatched = parsedResume.certifications.map(c => c.name);

    // Dynamically generate strengths, weaknesses, formatting issues and recommendations
    const formattingIssues: string[] = [];
    if (resumeText.length < 500) {
      formattingIssues.push("Resume length is very short. Expand descriptions to showcase accomplishments.");
    }
    if (!parsedResume.email) {
      formattingIssues.push("Contact email not explicitly detected in formatting scan.");
    }
    if (!parsedResume.education.degree) {
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

      if (!uploadError) {
        const { data: signedData } = await supabaseAdmin.storage
          .from("resumes")
          .createSignedUrl(filePath, 315360000);
        if (signedData) {
          fileUrl = signedData.signedUrl;
          fileName = originalName;
        }
      }

      // Save resume to database (Saves education, skills, certs, projects, experience as single source of truth)
      const { error: resumeError } = await supabaseAdmin
      .from("resumes")
      .upsert({
        user_id: userId,
        file_name: fileName || "resume.txt",
        file_url: fileUrl || "",
        ats_score: score,
        skills: extractedSkills,
        education: education,
        certifications: certificationsMatched,
        improvements: improvements,
        parsed_text: JSON.stringify({ // Store extended dynamically extracted details in parsed_text JSON
          email: parsedResume.email,
          phone: parsedResume.phone,
          linkedin: parsedResume.linkedin,
          github: parsedResume.github,
          portfolio: parsedResume.portfolio,
          projects: parsedResume.projects,
          experience: parsedResume.experience,
          languages: parsedResume.languages,
          raw: resumeText
        })
      });

    if (resumeError) {
      console.error("[Database Error] Failed to upsert resume:", resumeError);
    }
    
    // Log Version History in User Activity Table
    await supabaseAdmin.from("user_activity").insert({
      user_id: userId,
      action: "resume_upload_version",
      metadata: {
        file_name: fileName || "resume.txt",
        file_url: fileUrl || "",
        ats_score: score,
        skills: extractedSkills,
        education: education,
        certifications: certificationsMatched,
        projects: parsedResume.projects,
        experience: parsedResume.experience,
        improvements: improvements,
        upload_date: new Date().toISOString()
      }
    });

    // Automatically Update Profile (Name, Email, Links, Education) without user intervention
    const profileUpdate: any = {};
    if (parsedResume.name && parsedResume.name !== "Professional User") profileUpdate.name = parsedResume.name;
    if (parsedResume.email) profileUpdate.email = parsedResume.email;
    if (parsedResume.linkedin) profileUpdate.linkedin_url = parsedResume.linkedin;
    if (parsedResume.github) profileUpdate.github_url = parsedResume.github;
    if (parsedResume.education.degree) profileUpdate.degree = parsedResume.education.degree;
    if (parsedResume.education.college) profileUpdate.college = parsedResume.education.college;
    if (parsedResume.education.cgpa) profileUpdate.cgpa = parsedResume.education.cgpa;

    if (Object.keys(profileUpdate).length > 0) {
      await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", userId);
    }

    // Return the response
    const { error: profileError } = await supabaseAdmin
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

    if (profileError) {
      console.error("[Database Error] Failed to update profile:", profileError);
      throw new Error(`Failed to update profile: ${profileError.message}`);
    }

    // Save ATS report
    const { error: atsError } = await supabaseAdmin
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

    if (atsError) {
      console.error("[Database Error] Failed to save ATS report:", atsError);
      throw new Error(`Failed to save ATS report: ${atsError.message}`);
    }

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

    const { error: dnaError } = await supabaseAdmin
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

    if (dnaError) {
      console.error("[Database Error] Failed to upsert Career DNA:", dnaError);
      throw new Error(`Failed to save Career DNA details: ${dnaError.message}`);
    }

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

    const { error: empError } = await supabaseAdmin
      .from("employability_scores")
      .upsert({
        user_id: userId,
        overall_score: overallScoreVal,
        components,
        feedback
      });

    if (empError) {
      console.error("[Database Error] Failed to upsert Employability Score:", empError);
      throw new Error(`Failed to save Employability Score details: ${empError.message}`);
    }

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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  
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

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  
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

// =========================================================================
// 10. GET RESUME VERSION HISTORY
// =========================================================================
router.get("/resumes/history", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: history } = await supabaseAdmin
      .from("user_activity")
      .select("*")
      .eq("user_id", userId)
      .eq("action", "resume_upload_version")
      .order("created_at", { ascending: false });
    
    return res.json(history || []);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch resume history." });
  }
});

// =========================================================================
// 11. COMPARE RESUME VERSIONS
// =========================================================================
router.get("/resumes/compare", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: history } = await supabaseAdmin
      .from("user_activity")
      .select("*")
      .eq("user_id", userId)
      .eq("action", "resume_upload_version")
      .order("created_at", { ascending: false })
      .limit(2);
    
    if (!history || history.length < 2) {
      return res.json({ message: "Not enough resume versions to compare.", canCompare: false });
    }

    const latest = history[0].metadata;
    const previous = history[1].metadata;

    const addedSkills = (latest.skills || []).filter((s: string) => !(previous.skills || []).includes(s));
    const removedSkills = (previous.skills || []).filter((s: string) => !(latest.skills || []).includes(s));
    const newProjects = (latest.projects || []).filter((p: any) => !(previous.projects || []).some((pp: any) => pp.title === p.title));
    const newCertifications = (latest.certifications || []).filter((c: any) => !(previous.certifications || []).some((pp: any) => typeof c === 'string' ? pp === c : pp.name === c.name));
    
    const atsImprovement = (latest.ats_score || 0) - (previous.ats_score || 0);

    return res.json({
      canCompare: true,
      latestVersionDate: history[0].created_at,
      previousVersionDate: history[1].created_at,
      addedSkills,
      removedSkills,
      newProjects,
      newCertifications,
      atsImprovement,
      latestScore: latest.ats_score,
      previousScore: previous.ats_score
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to compute resume comparison." });
  }
});

// =========================================================================
// 12. COMPANY READINESS ANALYSIS
// =========================================================================
router.post("/company-readiness", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { companyName, targetRole } = req.body;
  if (!companyName || !targetRole) {
    return res.status(400).json({ message: "Company Name and Target Role are required." });
  }

  try {
    // 1. Fetch latest resume
    const { data: resumes } = await supabaseAdmin
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!resumes || resumes.length === 0) {
      return res.status(404).json({ message: "No resume found. Please upload a resume first." });
    }

    const latestResume = resumes[0];
    const userSkills = latestResume.skills || [];
    const userExperience = latestResume.parsed_text?.experience || [];
    const userProjects = latestResume.parsed_text?.projects || [];
    const userCerts = latestResume.certifications || [];

    // 2. Mock Role Requirements based on Company and Role
    // In a real scenario, this would query a "company_requirements" table
    const techReqs = targetRole.toLowerCase().includes("front") 
      ? ["React", "TypeScript", "Next.js", "CSS"]
      : targetRole.toLowerCase().includes("data") || targetRole.toLowerCase().includes("ml") || targetRole.toLowerCase().includes("ai")
      ? ["Python", "Machine Learning", "SQL", "Deep Learning", "TensorFlow", "PyTorch"]
      : ["Java", "Spring Boot", "AWS", "SQL", "Docker", "Kubernetes", "System Design"];
      
    if (companyName.toLowerCase() === "google") techReqs.push("Go", "GCP");
    if (companyName.toLowerCase() === "microsoft") techReqs.push("C#", ".NET", "Azure");
    if (companyName.toLowerCase() === "amazon") techReqs.push("AWS", "DynamoDB");

    const requiredSoft = ["System Design", "Communication", "Problem Solving", "Agile"];
    const requiredCerts = companyName.toLowerCase() === "amazon" ? ["AWS Certified Solutions Architect"] 
                        : companyName.toLowerCase() === "microsoft" ? ["Azure Fundamentals"] 
                        : [];
    
    // 3. Analyze Matches
    const userSkillsLower = userSkills.map((s: string) => s.toLowerCase());
    const missingTech = techReqs.filter(r => !userSkillsLower.includes(r.toLowerCase()));
    
    // Check if user has projects mapped to these tech reqs
    const projectTech = userProjects.flatMap((p: any) => p.technologies || []).map((t: string) => t.toLowerCase());
    const missingProjectExp = techReqs.filter(r => !projectTech.includes(r.toLowerCase()));

    // Experience Check
    const missingSoft = requiredSoft.filter(r => !userSkillsLower.includes(r.toLowerCase()));
    const missingCerts = requiredCerts.filter(r => !userCerts.map((c: any) => typeof c === 'string' ? c.toLowerCase() : c.name?.toLowerCase()).includes(r.toLowerCase()));

    // 4. Calculate Dynamic Score
    const techScore = Math.max(0, 100 - (missingTech.length * (100 / techReqs.length)));
    const expScore = Math.max(0, 100 - (missingProjectExp.length * 10));
    const finalScore = Math.round((techScore * 0.7) + (expScore * 0.3));

    // 5. Generate Recommendations
    const recommendations = [];
    if (missingTech.length > 0) {
      recommendations.push(`Master these missing technologies: ${missingTech.slice(0, 3).join(", ")}`);
    }
    if (missingProjectExp.length > 0) {
      recommendations.push(`Build projects showcasing: ${missingProjectExp.slice(0, 2).join(", ")}`);
    }
    if (missingCerts.length > 0) {
      recommendations.push(`Consider pursuing certifications like ${missingCerts[0]} to stand out at ${companyName}.`);
    }
    if (finalScore < 60) {
      recommendations.push(`Your profile needs significant alignment with ${companyName}'s requirements for a ${targetRole} role.`);
    }

    const missingSkillsObj = {
      technical: missingTech,
      soft: missingSoft,
      certifications: missingCerts,
      projects: missingProjectExp.slice(0, 3)
    };

    // 6. Store in Database
    const { data: savedReport, error: insertError } = await supabaseAdmin
      .from("company_readiness_reports")
      .insert({
        user_id: userId,
        company_name: companyName,
        target_role: targetRole,
        readiness_score: finalScore,
        missing_skills: missingSkillsObj,
        recommendations: recommendations
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[Database Error] Failed to save company readiness report:", insertError);
      return res.status(500).json({ message: "Analysis complete, but failed to save report." });
    }

    return res.json(savedReport);
  } catch (err) {
    console.error("Company Readiness Error:", err);
    return res.status(500).json({ message: "Failed to generate company readiness report." });
  }
});

router.get("/company-readiness/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: report, error } = await supabaseAdmin
      .from("company_readiness_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("[Database Error] fetching latest company readiness:", error);
      return res.status(500).json({ message: "Failed to fetch company readiness report." });
    }

    if (!report) {
      return res.status(404).json({ message: "No company readiness report found." });
    }

    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching company readiness report." });
  }
});

// =========================================================================
// 13. CAREER TWIN ANALYSIS
// =========================================================================
router.post("/career-twin", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: resumes } = await supabaseAdmin
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!resumes || resumes.length === 0) {
      return res.status(404).json({ message: "No resume found. Please upload a resume first." });
    }

    const latestResume = resumes[0];
    const userSkills = latestResume.skills || [];
    const parsed = latestResume.parsed_text || {};
    const userExperience = parsed.experience || [];
    const userProjects = parsed.projects || [];
    const rawText = (parsed.raw || "").toLowerCase();

    // 1. Dynamic Scoring Heuristics
    const techCount = userSkills.length;
    const technical_score = Math.min(100, 40 + (techCount * 3));
    
    const softSkillsKeywords = ["communication", "team", "collaborate", "lead", "manage", "resolve", "present"];
    const softMatches = softSkillsKeywords.filter(k => rawText.includes(k)).length;
    const soft_skills_score = Math.min(100, 50 + (softMatches * 10));

    const leadershipKeywords = ["lead", "led", "manage", "mentor", "director", "head", "founder", "vp"];
    const leadMatches = leadershipKeywords.filter(k => rawText.includes(k)).length;
    const leadership_potential = Math.min(100, 30 + (leadMatches * 15));

    const commKeywords = ["presented", "wrote", "negotiated", "collaborated", "published", "speaker"];
    const commMatches = commKeywords.filter(k => rawText.includes(k)).length;
    const communication_score = Math.min(100, 40 + (commMatches * 12));

    const problemKeywords = ["resolved", "optimized", "troubleshot", "designed", "architected", "analyzed"];
    const probMatches = problemKeywords.filter(k => rawText.includes(k)).length;
    const problem_solving_score = Math.min(100, 45 + (probMatches * 10));

    const learning_ability = Math.min(100, 50 + ((latestResume.certifications?.length || 0) * 15));

    // 2. Career Maturity Level
    const totalExpItems = userExperience.length;
    let maturity_level = "Entry Level";
    if (totalExpItems >= 2 && leadMatches > 0) maturity_level = "Mid-Level Professional";
    if (totalExpItems > 3 && leadMatches >= 2) maturity_level = "Senior Professional";
    if (leadMatches >= 4) maturity_level = "Executive / Staff Level";

    // 3. Career Personality
    let personality = "The Balanced Professional";
    if (technical_score > 85 && leadership_potential < 60) personality = "The Deep Technologist";
    if (leadership_potential > 80 && soft_skills_score > 80) personality = "The Visionary Leader";
    if (problem_solving_score > 85 && communication_score > 75) personality = "The Strategic Problem Solver";
    if (learning_ability > 85) personality = "The Perpetual Learner";

    // 4. Strengths & Improvement Areas
    const dimensions = [
      { name: "Technical Prowess", score: technical_score },
      { name: "Soft Skills", score: soft_skills_score },
      { name: "Leadership", score: leadership_potential },
      { name: "Communication", score: communication_score },
      { name: "Problem Solving", score: problem_solving_score },
      { name: "Learning Agility", score: learning_ability }
    ].sort((a, b) => b.score - a.score);

    const top_strengths = dimensions.slice(0, 3).map(d => d.name);
    // Add specific skills
    if (userSkills.length > 0) top_strengths.push(`Core competency in ${userSkills[0]}`);
    if (userExperience.length > 0) top_strengths.push("Proven track record in professional environments");
    
    const improvement_areas = dimensions.slice(-3).map(d => `Enhance ${d.name} capabilities`);
    if (latestResume.certifications?.length === 0) improvement_areas.push("Lack of formal certifications");

    // 5. Predicted Paths
    let predicted_paths = [];
    if (technical_score > 80 && rawText.includes("data")) predicted_paths = ["Senior Data Scientist", "Machine Learning Engineer", "AI Researcher"];
    else if (technical_score > 80 && rawText.includes("react")) predicted_paths = ["Frontend Architect", "Full Stack Lead", "UI/UX Engineer"];
    else if (leadership_potential > 80) predicted_paths = ["Engineering Manager", "Product Manager", "Tech Lead"];
    else predicted_paths = ["Software Engineer", "Systems Analyst", "Technical Consultant"];

    // 6. Growth Suggestions
    const growth_suggestions = [];
    if (leadership_potential < 60) growth_suggestions.push("Take ownership of a small project or mentor junior peers to build leadership skills.");
    if (communication_score < 70) growth_suggestions.push("Consider writing technical blogs or presenting at meetups to boost visibility.");
    if (technical_score < 70) growth_suggestions.push("Deepen your expertise by contributing to open source or building complex side projects.");
    growth_suggestions.push(`Leverage your strong ${top_strengths[0].toLowerCase()} to pivot towards ${predicted_paths[0]} roles.`);

    const reportData = {
      user_id: userId,
      personality,
      technical_score,
      soft_skills_score,
      leadership_potential,
      communication_score,
      problem_solving_score,
      learning_ability,
      maturity_level,
      top_strengths,
      improvement_areas,
      predicted_paths,
      growth_suggestions
    };

    const { data: savedReport, error: insertError } = await supabaseAdmin
      .from("career_twin_reports")
      .insert(reportData)
      .select("*")
      .single();

    if (insertError) {
      console.error("[Database Error] Failed to save career twin report:", insertError);
      return res.status(500).json({ message: "Analysis complete, but failed to save report." });
    }

    return res.json(savedReport);
  } catch (err) {
    console.error("Career Twin Error:", err);
    return res.status(500).json({ message: "Failed to generate career twin." });
  }
});

router.get("/career-twin/latest", authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { data: report, error } = await supabaseAdmin
      .from("career_twin_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("[Database Error] fetching latest career twin:", error);
      return res.status(500).json({ message: "Failed to fetch career twin report." });
    }

    if (!report) {
      return res.status(404).json({ message: "No career twin report found." });
    }

    return res.json(report);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error fetching career twin report." });
  }
});

export default router;
