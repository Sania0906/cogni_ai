import axios from "axios";

// Default API Base URL pointing to Node Express backend
// Detected LAN IP for physical device / Expo Go: 192.168.31.93
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://192.168.31.93:5000/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

let userToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  userToken = token;
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
};

export const api = {
  // ---------------------------------------------------------------------------
  // Auth & Profile
  // ---------------------------------------------------------------------------
  login: async (email: string, password: string) => {
    const res = await apiClient.post("/auth/login", { email, password });
    return res.data;
  },

  signup: async (
    name: string,
    email: string,
    password: string,
    confirmPassword?: string,
    role: string = "user"
  ) => {
    const res = await apiClient.post("/auth/signup", {
      name,
      email,
      password,
      confirmPassword: confirmPassword || password,
      role,
    });
    return res.data;
  },

  verifyOtp: async (email: string, code: string) => {
    const res = await apiClient.post("/auth/verify-otp", { email, code });
    return res.data;
  },

  getProfile: async () => {
    const res = await apiClient.get("/auth/profile");
    return res.data;
  },

  updateProfile: async (data: any) => {
    const res = await apiClient.put("/auth/profile", data);
    return res.data;
  },

  logout: async () => {
    const res = await apiClient.post("/auth/logout");
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // Jobs Portal & Bookmarks
  // ---------------------------------------------------------------------------
  getJobs: async () => {
    const res = await apiClient.get("/jobs");
    return res.data;
  },

  getJobById: async (id: string) => {
    const res = await apiClient.get(`/jobs/${id}`);
    return res.data;
  },

  saveJob: async (jobId: string) => {
    const res = await apiClient.post("/jobs/save", { jobId });
    return res.data;
  },

  getSavedJobs: async () => {
    const res = await apiClient.get("/jobs/saved");
    return res.data;
  },

  applyJob: async (jobId: string) => {
    const res = await apiClient.post("/jobs/apply", { jobId });
    return res.data;
  },

  getAppliedJobs: async () => {
    const res = await apiClient.get("/jobs/applied");
    return res.data;
  },

  deleteSavedJob: async (jobId: string) => {
    const res = await apiClient.delete(`/jobs/save/${jobId}`);
    return res.data;
  },

  getCompanyById: async (companyId: string) => {
    const res = await apiClient.get(`/jobs/company/${companyId}`);
    return res.data;
  },

  getSalaryInsights: async () => {
    const res = await apiClient.get("/jobs/salary-insights");
    return res.data;
  },

  getJobRecommendations: async () => {
    const res = await apiClient.get("/jobs/recommend");
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // Courses & Learning Progress
  // ---------------------------------------------------------------------------
  getCourses: async () => {
    const res = await apiClient.get("/courses");
    return res.data;
  },

  getCourseById: async (courseId: string) => {
    const res = await apiClient.get(`/courses/${courseId}`);
    return res.data;
  },

  enrollCourse: async (courseId: string) => {
    const res = await apiClient.post(`/courses/${courseId}/enroll`);
    return res.data;
  },

  getMyCourses: async () => {
    const res = await apiClient.get("/courses/my-courses");
    return res.data;
  },

  getLessonById: async (lessonId: string, courseId?: string) => {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
    const res = await apiClient.get(`/courses/lesson/${lessonId}${query}`);
    return res.data;
  },

  getLesson: async (lessonId: string, courseId?: string) => {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : "";
    const res = await apiClient.get(`/courses/lesson/${lessonId}${query}`);
    return res.data;
  },

  completeLesson: async (lessonId: string, courseId?: string) => {
    const res = await apiClient.post(`/courses/lesson/${lessonId}/complete`, { courseId });
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // Skills & Gap Analysis
  // ---------------------------------------------------------------------------
  getSkills: async () => {
    const res = await apiClient.get("/skills");
    return res.data;
  },

  getSkillById: async (id: string) => {
    const res = await apiClient.get(`/skills/${id}`);
    return res.data;
  },

  getSkillGap: async () => {
    const res = await apiClient.get("/skills/gap");
    return res.data;
  },

  getSkillGrowth: async () => {
    const res = await apiClient.get("/skills/growth");
    return res.data;
  },

  analyzeSkillGap: async (targetRole: string, skills?: string[]) => {
    const res = await apiClient.post("/skill/analyze", { targetRole, skills });
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // AI Innovation Modules & Real ML Inference
  // ---------------------------------------------------------------------------
  getCareerDNA: async () => {
    const res = await apiClient.get("/ai/career-dna");
    return res.data;
  },

  getCareerSuccess: async () => {
    const res = await apiClient.get("/ai/career-success");
    return res.data;
  },

  getIndustryDemand: async () => {
    const res = await apiClient.get("/ai/industry-demand");
    return res.data;
  },

  getEmployability: async () => {
    const res = await apiClient.get("/ai/employability");
    return res.data;
  },

  generateRoadmap: async (company: string, role: string) => {
    const res = await apiClient.post("/ai/roadmap/generate", { company, role });
    return res.data;
  },

  getLatestRoadmap: async () => {
    const res = await apiClient.get("/ai/roadmap/latest");
    return res.data;
  },

  updateMilestoneStatus: async (milestoneId: string, status: string, roadmapId?: string) => {
    const res = await apiClient.post(`/ai/roadmap/milestone/${milestoneId}/status`, { status, roadmapId });
    return res.data;
  },

  generateCompanyReadiness: async (companyName: string, targetRole: string) => {
    const res = await apiClient.post("/ai/company-readiness", { companyName, targetRole });
    return res.data;
  },

  getLatestCompanyReadiness: async () => {
    const res = await apiClient.get("/ai/company-readiness/latest");
    return res.data;
  },

  generateCareerTwin: async () => {
    const res = await apiClient.post("/ai/career-twin");
    return res.data;
  },

  getLatestCareerTwin: async () => {
    const res = await apiClient.get("/ai/career-twin/latest");
    return res.data;
  },

  generateInterview: async (company: string, role: string) => {
    const res = await apiClient.post("/ai/interview/generate", { company, role });
    return res.data;
  },

  evaluateInterview: async (sessionId: string, answers: any[]) => {
    const res = await apiClient.post("/ai/interview/evaluate", { sessionId, answers });
    return res.data;
  },

  uploadResume: async (formData: FormData) => {
    const res = await apiClient.post("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  optimizeResume: async (formData: FormData) => {
    const res = await apiClient.post("/ai/resume-optimize", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getLatestAtsReport: async () => {
    const res = await apiClient.get("/ai/ats-reports/latest");
    return res.data;
  },

  getResumeHistory: async () => {
    const res = await apiClient.get("/ai/resumes/history");
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // Notifications & Certificates
  // ---------------------------------------------------------------------------
  getNotifications: async () => {
    const res = await apiClient.get("/notifications");
    return res.data;
  },

  markNotificationRead: async (id: string) => {
    const res = await apiClient.post(`/notifications/${id}/read`);
    return res.data;
  },

  getCertificates: async () => {
    const res = await apiClient.get("/certificates");
    return res.data;
  },

  // ---------------------------------------------------------------------------
  // Recruiter & Admin Modules
  // ---------------------------------------------------------------------------
  getRecruiterCandidates: async (skills: string = "", min_experience: number = 0) => {
    let query = "";
    if (skills) query += `?skills=${encodeURIComponent(skills)}`;
    if (min_experience > 0) query += `${query ? "&" : "?"}min_experience=${min_experience}`;
    const res = await apiClient.get(`/recruiter/candidates${query}`);
    return res.data;
  },

  toggleShortlist: async (candidateId: string, shortlisted?: boolean) => {
    const res = await apiClient.post("/recruiter/shortlist", { candidateId, shortlisted });
    return res.data;
  },

  getShortlistedCandidates: async () => {
    const res = await apiClient.get("/recruiter/shortlist");
    return res.data;
  },

  getPlatformAnalytics: async () => {
    const res = await apiClient.get("/analytics/android-vs-web");
    return res.data;
  },

  getAdminAnalytics: async () => {
    const res = await apiClient.get("/admin/analytics");
    return res.data;
  },

  getAdminReports: async () => {
    const res = await apiClient.get("/admin/reports");
    return res.data;
  },
};
