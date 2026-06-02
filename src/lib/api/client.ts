// CognifyAI API Client for REST Server
const BASE_URL = "/api";

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  if (!(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch (_) {
      // ignore
    }
    const errMsg = errorData?.message || `API Error: ${response.status} ${response.statusText}`;
    const err = new Error(errMsg);
    (err as any).status = response.status;
    (err as any).data = errorData;
    throw err;
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  login: async (email: string, password: string) => {
    return fetchAPI<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  signup: async (name: string, email: string, password: string, confirmPassword: string) => {
    return fetchAPI<{ message: string; email: string; otp?: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });
  },

  sendOtp: async (email: string) => {
    return fetchAPI<{ message: string; email: string; otp?: string }>("/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  verifyOtp: async (email: string, code: string) => {
    return fetchAPI<{ token: string; user: any }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
  },

  forgotPassword: async (email: string) => {
    return fetchAPI<{ message: string; email: string; otp?: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (email: string, code: string, password: string, confirmPassword: string) => {
    return fetchAPI<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, code, password, confirmPassword }),
    });
  },

  getProfile: async () => {
    return fetchAPI<any>("/auth/profile");
  },

  getCertificates: async () => {
    return fetchAPI<any[]>("/certificates");
  },

  getNotifications: async () => {
    return fetchAPI<any[]>("/notifications");
  },

  completeProfile: async (data: any) => {
    return fetchAPI<any>("/auth/profile/complete", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },

  completeOnboarding: async (category: string, score: number) => {
    return fetchAPI<any>("/auth/onboarding/complete", {
      method: "POST",
      body: JSON.stringify({ category, score })
    });
  },

  submitAssessment: async (category: string, score: number) => {
    return fetchAPI<any>("/assessments", {
      method: "POST",
      body: JSON.stringify({ category, score })
    });
  },

  getAssessments: async () => {
    return fetchAPI<any[]>("/assessments");
  },

  getDynamicQuestions: async () => {
    return fetchAPI<{ category: string; questions: any[] }>("/assessments/questions");
  },

  getRecommendedCourses: async () => {
    return fetchAPI<any[]>("/recommendations/courses");
  },

  // Skills
  getSkills: async () => {
    return fetchAPI<any[]>("/skills");
  },

  addSkill: async (skill: { name: string; category: string; level: string; progress: number }) => {
    return fetchAPI<any>("/skills", {
      method: "POST",
      body: JSON.stringify(skill)
    });
  },

  updateSkill: async (id: string, skill: { progress?: number; level?: string }) => {
    return fetchAPI<any>(`/skills/${id}`, {
      method: "PUT",
      body: JSON.stringify(skill)
    });
  },

  deleteSkill: async (id: string) => {
    return fetchAPI<any>(`/skills/${id}`, {
      method: "DELETE"
    });
  },

  getSkillGap: async () => {
    return fetchAPI<{
      targetRole: string;
      matchPercentage: number;
      skills: { name: string; current: number; required: number; gap: number; status: string }[];
    }>("/skills/gap");
  },

  getSkillGrowth: async () => {
    return fetchAPI<{
      historical: { month: string; score: number }[];
      predicted: { month: string; score: number }[];
      acceleratedStudyPrediction: { month: string; score: number }[];
    }>("/skills/growth");
  },

  // Courses
  getCourses: async () => {
    return fetchAPI<any[]>("/courses");
  },

  getMyCourses: async () => {
    return fetchAPI<any[]>("/courses/my-courses");
  },

  // Jobs
  getJobs: async () => {
    return fetchAPI<any[]>("/jobs");
  },

  getSalaryInsights: async () => {
    return fetchAPI<any>("/jobs/salary-insights");
  },

  getAppliedJobs: async () => {
    return fetchAPI<any[]>("/jobs/applied");
  },

  // AI Innovation Modules
  getCareerDNA: async () => {
    return fetchAPI<{
      archetype: string;
      tagline: string;
      dimensions: { subject: string; val: number; angle: number }[];
      strengths: string[];
      weaknesses: string[];
      recommendedEnvironments: string[];
    }>("/ai/career-dna");
  },

  getCareerSuccess: async () => {
    return fetchAPI<{
      targetRole: string;
      probabilityScore: number;
      breakdown: { name: string; rating: number; detail: string }[];
      growthOutlook: string;
      alternativeRoles: { role: string; prob: number }[];
    }>("/ai/career-success");
  },

  getIndustryDemand: async () => {
    return fetchAPI<{
      categories: { name: string; growth: number; openings: number; salary: number; trend: string }[];
      marketDrivers: string[];
    }>("/ai/industry-demand");
  },

  getRoadmap: async () => {
    return fetchAPI<{
      goal: string;
      nodes: {
        id: string;
        title: string;
        description: string;
        duration: string;
        status: string;
        skills: string[];
        courses: { name: string; path: string }[];
      }[];
    }>("/ai/roadmap");
  },

  getEmployability: async () => {
    return fetchAPI<{
      overallScore: number;
      components: { label: string; score: number; status: string }[];
      feedback: string[];
    }>("/ai/employability");
  },

  getCareerPaths: async () => {
    return fetchAPI<{
      role: string;
      matchPercentage: number;
      salaryRange: string;
      requiredSkills: string[];
      missingSkills: string[];
      learningRoadmap: string[];
    }[]>("/ai/career-paths");
  },

  optimizeResume: async (resumeData: string | FormData, targetJob?: string) => {
    if (resumeData instanceof FormData) {
      return fetchAPI<{
        score: number;
        targetJob: string;
        keywordMatch: { word: string; status: "found" | "missing"; suggestion?: string }[];
        improvements: string[];
      }>("/ai/resume-optimize", {
        method: "POST",
        body: resumeData,
      });
    }

    return fetchAPI<{
      score: number;
      targetJob: string;
      keywordMatch: { word: string; status: "found" | "missing"; suggestion?: string }[];
      improvements: string[];
    }>("/ai/resume-optimize", {
      method: "POST",
      body: JSON.stringify({ resumeText: resumeData, targetJob }),
    });
  },

  getLatestAtsReport: async () => {
    return fetchAPI<{
      id: string;
      user_id: string;
      score: number;
      strengths: string[];
      weaknesses: string[];
      recommendations: string[];
      created_at: string;
    }>("/ai/ats-reports/latest");
  },

  getPlatformAnalytics: async () => {
    return fetchAPI<{
      metrics: { name: string; android: number; web: number; unit: string; desc?: string }[];
      platformGrowth: { month: string; android: number; web: number }[];
      geographicStats: { country: string; android: number; web: number }[];
    }>("/analytics/android-vs-web");
  },

  getCareerForecasting: async () => {
    return fetchAPI<{
      roles: { name: string; risk: number; growth: number; emerging: boolean; notes?: string }[];
      automationDrivers: string[];
    }>("/ai/career-forecasting");
  },

  sendChatMessage: async (message: string) => {
    return fetchAPI<{ reply: string }>("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },
};
