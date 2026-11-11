// aiGenerator.ts - Deterministic rubric-based and skill-grounded analytical computations
// Zero fake random numbers or seeded hallucinations.

function countMatches(text: string, keywords: string[]): number {
  const lower = (text || "").toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
}

export function generateCareerDNA(_userId: string, resumeText: string) {
  const text = (resumeText || "").toLowerCase();

  const mlCount = countMatches(text, ["python", "machine learning", "pytorch", "tensorflow", "scikit", "pandas", "nlp", "data"]);
  const archCount = countMatches(text, ["system design", "docker", "kubernetes", "aws", "microservices", "cloud", "postgres", "redis", "api"]);
  const uiCount = countMatches(text, ["react", "typescript", "javascript", "css", "tailwind", "html", "frontend", "ui", "ux"]);
  const leadCount = countMatches(text, ["lead", "architect", "mentor", "managed", "strategy", "roadmap", "stakeholder", "ownership"]);
  const execCount = countMatches(text, ["deployed", "built", "shipped", "optimized", "reduced", "increased", "ci/cd", "testing"]);

  const innovation = Math.min(95, 60 + mlCount * 6 + uiCount * 3);
  const execution = Math.min(96, 60 + execCount * 6 + archCount * 3);
  const strategy = Math.min(94, 58 + leadCount * 7 + archCount * 2);
  const communication = Math.min(92, 62 + leadCount * 6 + countMatches(text, ["collaborated", "presented", "documented"]) * 5);
  const technical = Math.min(98, 60 + (mlCount + archCount + uiCount) * 3);

  let selected = { name: "The Architect", tag: "Structural & Logical", env: ["Enterprise", "Backend Engineering", "Infrastructure"] };
  if (mlCount >= archCount && mlCount >= uiCount) {
    selected = { name: "The Optimizer", tag: "Analytical & Data-Driven", env: ["AI/ML Labs", "Data Engineering", "FinTech"] };
  } else if (uiCount > archCount && uiCount > mlCount) {
    selected = { name: "The Innovator", tag: "Creative & Experience-Focused", env: ["Consumer Products", "Frontend Platforms", "Design Systems"] };
  } else if (leadCount >= 3) {
    selected = { name: "The Catalyst", tag: "Leadership & Impact", env: ["Tech Leadership", "Product Strategy", "Scaleups"] };
  }

  return {
    archetype: selected.name,
    tagline: selected.tag,
    dimensions: [
      { subject: "Innovation", val: innovation, angle: 0 },
      { subject: "Execution", val: execution, angle: 72 },
      { subject: "Strategy", val: strategy, angle: 144 },
      { subject: "Communication", val: communication, angle: 216 },
      { subject: "Technical", val: technical, angle: 288 },
    ],
    strengths: ["Analytical Problem Solving", "Technical Execution", "Systems Thinking"],
    weaknesses: ["Cross-domain delegation", "Public technical speaking"],
    recommendedEnvironments: selected.env,
  };
}

export function generateCompanyReadiness(companyName: string, targetRole: string, resumeText: string) {
  const targetLower = (targetRole || "software engineer").toLowerCase();
  const roleKeywords = targetLower.includes("data") || targetLower.includes("ml")
    ? ["python", "sql", "machine learning", "pandas", "statistics", "scikit", "tensorflow", "pytorch", "docker", "api"]
    : targetLower.includes("frontend")
      ? ["react", "typescript", "javascript", "css", "html", "tailwind", "testing", "accessibility", "git"]
      : ["typescript", "javascript", "node", "react", "sql", "postgresql", "docker", "aws", "git", "system design"];

  const matched = roleKeywords.filter((kw) => (resumeText || "").toLowerCase().includes(kw));
  const missing = roleKeywords.filter((kw) => !(resumeText || "").toLowerCase().includes(kw));

  const technicalFit = Math.min(98, Math.max(35, Math.round((matched.length / roleKeywords.length) * 100)));
  const culturalFit = Math.min(95, 65 + countMatches(resumeText, ["team", "collaborat", "mentor", "agile", "lead", "impact"]) * 6);
  const readiness = Math.round(technicalFit * 0.7 + culturalFit * 0.3);

  return {
    company_name: companyName,
    companyName: companyName,
    target_role: targetRole,
    targetRole: targetRole,
    readiness_score: readiness,
    readinessScore: readiness,
    summary: `Deterministic readiness rubric for ${targetRole} at ${companyName}: matched ${matched.length}/${roleKeywords.length} benchmark role skills (${readiness}% overall).`,
    cultural_fit: culturalFit,
    culturalFit: culturalFit,
    technical_fit: technicalFit,
    technicalFit: technicalFit,
    gaps: missing.length > 0 ? missing.slice(0, 5) : ["Large-scale System Design", "Latency Optimization"],
    recommendations:
      missing.length > 0
        ? missing.slice(0, 3).map((m) => `Gain hands-on project proof in ${m} to align with ${companyName} standards.`)
        : [`Prepare distributed architecture case studies tailored to ${companyName}.`],
  };
}

export function generateCareerTwin(_userId: string, resumeText: string) {
  const lower = (resumeText || "").toLowerCase();
  const isML = countMatches(lower, ["machine learning", "pytorch", "tensorflow", "scikit", "pandas", "data science"]) >= 2;
  const isDevOps = countMatches(lower, ["docker", "kubernetes", "aws", "terraform", "ci/cd", "linux"]) >= 2;
  const isFrontend = countMatches(lower, ["react", "css", "tailwind", "frontend", "figma", "ui"]) >= 2;

  let selected = {
    p: "Linus Torvalds - System Architect",
    roles: ["Backend Developer", "Systems Engineer", "Full Stack Developer"],
    desc: "Your engineering profile shows strong alignment with core architecture, reliability, and practical system implementation.",
  };

  if (isML) {
    selected = {
      p: "Ada Lovelace - Analytical Pioneer",
      roles: ["Data Scientist", "Machine Learning Engineer", "AI Research Engineer"],
      desc: "Your technical skills demonstrate a clear analytical focus across machine learning modeling, Python, and data pipelines.",
    };
  } else if (isDevOps) {
    selected = {
      p: "Werner Vogels - Cloud Visionary",
      roles: ["DevOps Engineer", "Cloud Architect", "Site Reliability Engineer"],
      desc: "Your profile emphasizes cloud scalability, container orchestration, and resilient distributed infrastructure.",
    };
  } else if (isFrontend) {
    selected = {
      p: "Jony Ive - Interface Virtuoso",
      roles: ["Frontend Developer", "UI Engineer", "Full Stack Developer"],
      desc: "Your experience reflects a high standard for user-facing architecture, interactive components, and web responsiveness.",
    };
  }

  return {
    archetype: selected.p,
    personality: selected.p,
    summary: selected.desc,
    description: selected.desc,
    strengths: ["Technical Depth", "Structured Problem Solving", "Production Delivery"],
    weaknesses: ["Executive Storytelling", "Cross-Org Dependency Mapping"],
    recommended_roles: selected.roles,
  };
}

export function generateLearningRoadmap(role: string, company: string, resumeText: string) {
  const lower = (resumeText || "").toLowerCase();
  const hasCore = lower.length > 50;

  const nodes = [
    {
      id: "1",
      type: "course",
      label: "Core Foundations",
      status: hasCore ? "completed" : "in-progress",
      description: `Master core computer science & programming essentials for ${role}.`,
    },
    {
      id: "2",
      type: "project",
      label: "Build Portfolio Project",
      status: hasCore ? "in-progress" : "locked",
      description: `Develop a scalable portfolio application demonstrating production ${role} skills.`,
    },
    {
      id: "3",
      type: "certification",
      label: "Cloud & Infrastructure Fluency",
      status: lower.includes("docker") || lower.includes("aws") ? "completed" : "locked",
      description: "Validate cloud, containerization, and deployment skills.",
    },
    {
      id: "4",
      type: "interview",
      label: "Mock Interviews",
      status: "locked",
      description: `Practice behavioral STAR responses and system design for ${company}.`,
    },
    {
      id: "5",
      type: "job",
      label: `Apply to ${company}`,
      status: "locked",
      description: `Finalize ATS-optimized resume and apply for ${role} at ${company}.`,
    },
  ];

  const milestones = nodes.map((n) => ({
    id: n.id,
    title: n.label,
    description: n.description,
    status: n.status,
    completed: n.status === "completed",
  }));

  return {
    goal: `Land a ${role} position at ${company}`,
    title: `Land a ${role} position at ${company}`,
    nodes,
    milestones,
  };
}

export function generateInterviewQuestions(company: string, role: string, resumeText: string) {
  const targetCompany = company || "this company";
  const targetRole = role || "Software Engineer";
  const lower = (resumeText || "").toLowerCase();

  const skillFocus = lower.includes("python") || lower.includes("machine learning")
    ? "model evaluation, data pipelines, and production inference"
    : lower.includes("react") || lower.includes("typescript")
      ? "state management, frontend performance, and component architecture"
      : "backend scalability, database indexing, and API reliability";

  return [
    {
      id: "q1",
      question: `Why do you want to join ${targetCompany} as a ${targetRole}, and how does your background prepare you for this role?`,
      type: "Behavioral",
      difficulty: "Medium",
    },
    {
      id: "q2",
      question: `Using the STAR method (Situation, Task, Action, Result), describe a challenging technical project involving ${skillFocus}.`,
      type: "Experience",
      difficulty: "Hard",
    },
    {
      id: "q3",
      question: `How would you design a high-throughput, fault-tolerant system supporting ${targetRole} responsibilities at ${targetCompany}?`,
      type: "Technical",
      difficulty: "Expert",
    },
    {
      id: "q4",
      question: "Describe a disagreement with a teammate over an architectural decision and how you resolved it constructively.",
      type: "Collaboration",
      difficulty: "Medium",
    },
  ];
}

export function evaluateInterviewAnswers(answersInput: any) {
  // Normalize answers array (handles string[], {answer: string}[], or single string)
  const rawList: string[] = Array.isArray(answersInput)
    ? answersInput.map((a) => (typeof a === "string" ? a : a?.answer || a?.text || ""))
    : typeof answersInput === "string"
      ? [answersInput]
      : [];

  const technicalSignals = [
    "architecture", "database", "api", "cache", "redis", "postgres", "sql", "index", "scale",
    "latency", "throughput", "microservice", "queue", "docker", "kubernetes", "aws", "cloud",
    "security", "auth", "token", "testing", "react", "typescript", "node", "python", "model",
    "pipeline", "algorithm", "complexity", "monitoring", "logging",
  ];
  const starSignals = [
    "situation", "task", "action", "result", "outcome", "impact", "improved", "reduced",
    "increased", "built", "designed", "implemented", "deployed", "led", "team", "solved",
    "collaborated", "measured", "metric", "percent", "%",
  ];

  if (rawList.length === 0 || rawList.every((t) => t.trim().length === 0)) {
    return {
      score: 0,
      overallScore: 0,
      feedback: "No interview responses were submitted. Please provide detailed answers to receive a rubric evaluation.",
      breakdown: [],
      method: "deterministic_rubric",
    };
  }

  const breakdown = rawList.map((raw, idx) => {
    const trimmed = (raw || "").trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const lower = trimmed.toLowerCase();

    if (words < 5) {
      return {
        questionIndex: idx + 1,
        wordCount: words,
        score: Math.min(20, words * 4),
        strengths: [],
        suggestions: "Answer is too brief. Expand with concrete technical context, your specific actions, and measurable outcomes.",
      };
    }

    // 1. Depth score (up to 40 pts for >= 40 words)
    const depthScore = Math.min(40, Math.round((words / 40) * 40));

    // 2. Technical vocabulary (up to 30 pts)
    const techHits = technicalSignals.filter((kw) => lower.includes(kw));
    const techScore = Math.min(30, techHits.length * 6);

    // 3. STAR structure & quantified impact (up to 30 pts)
    const starHits = starSignals.filter((kw) => lower.includes(kw));
    const hasNumbers = /\d+/.test(trimmed);
    const starScore = Math.min(30, starHits.length * 5 + (hasNumbers ? 10 : 0));

    const qScore = Math.min(100, depthScore + techScore + starScore);

    const strengths: string[] = [];
    if (words >= 25) strengths.push(`Good response depth (${words} words)`);
    if (techHits.length >= 2) strengths.push(`Strong technical specificity (${techHits.slice(0, 3).join(", ")})`);
    if (starHits.length >= 2 || hasNumbers) strengths.push("Clear action-oriented framing and measurable context");

    let suggestions = "Well-structured answer.";
    if (words < 20) {
      suggestions = "Elaborate further on implementation trade-offs and final results.";
    } else if (techHits.length < 2) {
      suggestions = "Include specific technologies, system components, or architectural trade-offs.";
    } else if (!hasNumbers && starHits.length < 2) {
      suggestions = "Structure the response with the STAR method and quantify measurable impact (e.g. latency % or user volume).";
    }

    return {
      questionIndex: idx + 1,
      wordCount: words,
      score: qScore,
      strengths,
      suggestions,
    };
  });

  const avgScore = Math.round(breakdown.reduce((acc, b) => acc + b.score, 0) / breakdown.length);

  let feedback = "";
  if (avgScore >= 80) {
    feedback = `Strong performance (${avgScore}%): Your responses demonstrate solid technical vocabulary, detail, and clear outcome framing.`;
  } else if (avgScore >= 55) {
    feedback = `Solid foundation (${avgScore}%): Add more system-level architectural specifics and quantify measurable outcomes using metrics.`;
  } else {
    feedback = `Needs deeper detail (${avgScore}%): Responses are currently brief. Use the STAR framework (Situation, Task, Action, Result) and cite concrete technical choices.`;
  }

  return {
    score: avgScore,
    overallScore: avgScore,
    feedback,
    breakdown,
    method: "deterministic_rubric",
  };
}

export function parseResumeAlgorithm(resumeText: string, targetJob: string) {
  const keywords = ["React", "Node.js", "TypeScript", "System Design", "AWS", "Python", "SQL", "Docker"];
  const lower = (resumeText || "").toLowerCase();

  const keywordMatch = keywords.map((word) => {
    const isFound = lower.includes(word.toLowerCase());
    return {
      word,
      status: isFound ? "found" : "missing",
      suggestion: isFound ? undefined : `Add ${word} experience to highlight your fit for ${targetJob}.`,
    };
  });

  const foundCount = keywordMatch.filter((k) => k.status === "found").length;
  const score = Math.round((foundCount / keywords.length) * 100);

  return {
    score,
    targetJob,
    keywordMatch,
    improvements: [
      "Quantify achievements with metrics (e.g. 'Reduced API latency by 35%').",
      "Include an executive summary tailored to your target role.",
      "Ensure core technical skills match the target job description.",
    ],
    extractedSkills: keywordMatch.filter((k) => k.status === "found").map((k) => k.word),
  };
}

export function generateCareerForecasting(resumeText: string) {
  const hasAI = (resumeText || "").toLowerCase().includes("python") || (resumeText || "").toLowerCase().includes("learning");
  return {
    roles: [
      { name: "AI Integration Engineer", risk: 15, growth: hasAI ? 90 : 82, emerging: true, notes: "High demand across enterprise software." },
      { name: "Full Stack Architect", risk: 25, growth: 68, emerging: false, notes: "Consistent market need for distributed web & API ownership." },
      { name: "Cloud Security Specialist", risk: 18, growth: 78, emerging: true, notes: "Expanding demand driven by compliance and zero-trust architecture." },
    ],
    automationDrivers: ["AI Code Copilots", "Managed Cloud Serverless Platforms", "Automated CI/CD Testing Pipelines"],
  };
}
