// aiGenerator.ts - Dynamic algorithmic data generation based on user inputs
import crypto from "crypto";

// Deterministic random number generator (0 to 1) based on a seed string
function seededRandom(seed: string) {
  const hash = crypto.createHash("sha256").update(seed).digest("hex");
  return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
}

export function generateCareerDNA(userId: string, resumeText: string) {
  const seed = userId + resumeText.length;
  const rand = seededRandom(seed);
  
  const archetypes = [
    { name: "The Innovator", tag: "Visionary & Creative", env: ["Startups", "R&D Labs", "Tech Hubs"] },
    { name: "The Architect", tag: "Structural & Logical", env: ["Enterprise", "Backend Engineering", "Infrastructure"] },
    { name: "The Optimizer", tag: "Efficient & Analytical", env: ["Data Science", "Operations", "FinTech"] },
    { name: "The Catalyst", tag: "Leadership & Impact", env: ["Product Management", "Executive", "Consulting"] },
  ];
  
  const selected = archetypes[Math.floor(rand * archetypes.length)];
  
  return {
    archetype: selected.name,
    tagline: selected.tag,
    dimensions: [
      { subject: "Innovation", val: Math.floor(70 + rand * 30), angle: 0 },
      { subject: "Execution", val: Math.floor(60 + (1 - rand) * 40), angle: 72 },
      { subject: "Strategy", val: Math.floor(65 + rand * 35), angle: 144 },
      { subject: "Communication", val: Math.floor(55 + (1 - rand) * 45), angle: 216 },
      { subject: "Technical", val: Math.floor(75 + rand * 25), angle: 288 }
    ],
    strengths: ["Strategic Planning", "Analytical Thinking", "Rapid Learning"],
    weaknesses: ["Over-analyzing", "Perfectionism"],
    recommendedEnvironments: selected.env
  };
}

export function generateCompanyReadiness(companyName: string, targetRole: string, resumeText: string) {
  const seed = companyName + targetRole + resumeText.substring(0, 50);
  const rand = seededRandom(seed);
  
  const readiness = Math.floor(50 + rand * 45); // 50 to 95
  
  return {
    company_name: companyName,
    target_role: targetRole,
    readiness_score: readiness,
    cultural_fit: Math.floor(60 + seededRandom(seed + "culture") * 40),
    technical_fit: Math.floor(40 + seededRandom(seed + "tech") * 55),
    gaps: ["Advanced System Design", "Cloud Infrastructure Scaling"],
    recommendations: ["Complete AWS Certified Solutions Architect", "Build a microservices portfolio project"]
  };
}

export function generateCareerTwin(userId: string, resumeText: string) {
  const seed = userId + resumeText.substring(0, 100);
  const rand = seededRandom(seed);
  
  const personalities = [
    { p: "Steve Jobs - Visionary Leader", roles: ["Product Manager", "CEO", "Design Lead"] },
    { p: "Ada Lovelace - Analytical Pioneer", roles: ["Data Scientist", "Algorithm Engineer", "Researcher"] },
    { p: "Linus Torvalds - System Architect", roles: ["DevOps Engineer", "Backend Developer", "Open Source Contributor"] },
    { p: "Sheryl Sandberg - Growth Strategist", roles: ["Operations Manager", "Growth Hacker", "Director"] }
  ];
  const selected = personalities[Math.floor(rand * personalities.length)];
  
  return {
    personality: selected.p,
    strengths: ["Visionary thinking", "Uncompromising quality", "Deep focus"],
    weaknesses: ["Impatience with inefficiency", "Workaholism"],
    recommended_roles: selected.roles,
    description: `Your profile matches closely with the working style of ${selected.p}. You thrive on hard problems and visionary goals.`
  };
}

export function generateLearningRoadmap(role: string, company: string, resumeText: string) {
  const seed = role + company + resumeText.length;
  
  return {
    goal: `Land a ${role} position at ${company}`,
    nodes: [
      { id: "1", type: "course", label: "Core Foundations", status: "completed", description: "Master the basics required for the role." },
      { id: "2", type: "project", label: "Build Portfolio Project", status: "in-progress", description: "Develop a scalable web application demonstrating full-stack skills." },
      { id: "3", type: "certification", label: "Cloud Certification", status: "locked", description: "Obtain AWS or Azure certification." },
      { id: "4", type: "interview", label: "Mock Interviews", status: "locked", description: "Practice behavioral and technical rounds." },
      { id: "5", type: "job", label: `Apply to ${company}`, status: "locked", description: "Finalize resume and apply." }
    ]
  };
}

export function generateInterviewQuestions(company: string, role: string, resumeText: string) {
  return [
    { question: `Why do you want to work at ${company} as a ${role}?`, type: "Behavioral", difficulty: "Medium" },
    { question: `Based on your resume, describe a time you had to overcome a technical challenge.`, type: "Experience", difficulty: "Hard" },
    { question: `How would you design a scalable system for ${role} responsibilities?`, type: "Technical", difficulty: "Expert" },
    { question: "Where do you see your career heading in the next 5 years?", type: "HR", difficulty: "Easy" }
  ];
}

export function evaluateInterviewAnswers(answers: any[]) {
  const rand = seededRandom(JSON.stringify(answers));
  const score = Math.floor(60 + rand * 35);
  return {
    score,
    feedback: score > 80 ? "Excellent responses! Your technical depth is solid." : "Good effort, but try to use the STAR method to structure your behavioral answers better.",
  };
}

export function parseResumeAlgorithm(resumeText: string, targetJob: string) {
  const seed = resumeText.length.toString() + targetJob;
  const rand = seededRandom(seed);
  
  const score = Math.floor(45 + rand * 50); // 45 to 95
  const keywords = ["React", "Node.js", "TypeScript", "System Design", "AWS", "Agile", "Leadership"];
  
  const keywordMatch = keywords.map(word => {
    const isFound = seededRandom(seed + word) > 0.4; // 60% chance found
    return {
      word,
      status: isFound ? "found" : "missing",
      suggestion: isFound ? undefined : `Add ${word} experience to highlight your fit for ${targetJob}.`
    };
  });
  
  return {
    score,
    targetJob,
    keywordMatch,
    improvements: [
      "Quantify your achievements with metrics (e.g. 'Improved speed by 20%').",
      "Add a dedicated summary section at the top.",
      "Ensure all bullet points start with strong action verbs."
    ],
    extractedSkills: keywordMatch.filter(k => k.status === "found").map(k => k.word)
  };
}

export function generateCareerForecasting(resumeText: string) {
  const seed = resumeText.length.toString();
  const rand = seededRandom(seed);
  
  return {
    roles: [
      { name: "AI Integration Engineer", risk: 15, growth: 85, emerging: true, notes: "High demand across all sectors." },
      { name: "Full Stack Developer", risk: 40, growth: 50, emerging: false, notes: "Stable but increasingly automated." },
      { name: "Data Privacy Officer", risk: 20, growth: 70, emerging: true, notes: "Driven by new regulations." }
    ],
    automationDrivers: ["Generative AI Coding Assistants", "No-code Platforms", "Automated QA Tools"]
  };
}
