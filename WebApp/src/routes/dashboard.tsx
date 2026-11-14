import {
  createFileRoute,
  Link,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Bell,
  Search,
  Award,
  BookOpen,
  Brain,
  GitFork,
  Flame,
  CheckCircle,
  LineChart,
  FileText,
  Monitor,
  ShieldAlert,
  Sparkles,
  Upload,
  Building,
  User,
  ChevronRight,
  TrendingUp,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Home — CognifyAI" }] }),
  component: Dashboard,
});

const aiModules: Array<{
  to: string;
  label: string;
  icon: typeof Brain;
  color: string;
  bg: string;
  adminOnly?: boolean;
}> = [
  {
    to: "/career",
    label: "Career DNA",
    icon: Brain,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    to: "/skill-gap",
    label: "Skill Gap",
    icon: Flame,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    to: "/career-success",
    label: "Success Rate",
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    to: "/industry-demand",
    label: "Market Intel",
    icon: LineChart,
    color: "text-pink",
    bg: "bg-pink/10",
  },
  {
    to: "/roadmap-generator",
    label: "AI Roadmap",
    icon: GitFork,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    to: "/employability",
    label: "Employability",
    icon: Award,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    to: "/skill-growth",
    label: "Growth Engine",
    icon: Sparkles,
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    to: "/platform-analytics",
    label: "Platform Metrics",
    icon: Monitor,
    color: "text-primary",
    bg: "bg-primary/10",
    adminOnly: true,
  },
  {
    to: "/career-forecasting",
    label: "Career Forecast",
    icon: ShieldAlert,
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    to: "/company-readiness",
    label: "Company Readiness",
    icon: Building,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    to: "/career-twin",
    label: "Career Twin",
    icon: User,
    color: "text-success",
    bg: "bg-success/10",
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [userRole, setUserRole] = useState("user");
  const [unreadNotifs, setUnreadNotifs] = useState(false);
  const [recommendedPaths, setRecommendedPaths] = useState<any[]>([]);
  const [activeCourse, setActiveCourse] = useState<any>(null);

  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [targetRole, setTargetRole] = useState<string>("Software Engineer");
  const [dnaTagline, setDnaTagline] = useState<string>("Analytical & High-Impact Builder");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dynamic Dashboard Career Index metrics
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [assessmentScore, setAssessmentScore] = useState<number | null>(null);
  const [employabilityScore, setEmployabilityScore] = useState<number | null>(
    null,
  );
  const [learningProgress, setLearningProgress] = useState<number | null>(null);
  const [careerDnaArchetype, setCareerDnaArchetype] = useState<string | null>(
    null,
  );
  const [companyReadiness, setCompanyReadiness] = useState<any>(null);
  const [careerTwin, setCareerTwin] = useState<any>(null);

  // Skill Gap Analysis State
  const [skillGap, setSkillGap] = useState<{
    targetRole: string;
    matchPercentage: number;
    skills: {
      name: string;
      current: number;
      required: number;
      gap: number;
      status: string;
    }[];
  } | null>(null);

  // Recommended Courses State
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);

  async function loadDashboardData() {
    try {
      const profile = await api.getProfile().catch(() => null);
      if (profile?.name) {
        setUserName(profile.name);
        localStorage.setItem("userName", profile.name);
      }
      if (profile?.role) {
        setUserRole(String(profile.role).toLowerCase().trim());
      }

      // Check if resume exists
      const atsReport = await api.getLatestAtsReport().catch(() => null);
      const resumeScore = atsReport?.score || profile?.resumeDetails?.ats_score;
      const resumeUploaded = !!resumeScore;
      setHasResume(resumeUploaded);

      if (resumeScore) {
        setAtsScore(resumeScore);
      }

      const roleFound =
        profile?.target_role ||
        profile?.targetRole ||
        (atsReport as any)?.target_role ||
        (atsReport as any)?.predicted_role ||
        profile?.title ||
        "Software Engineer";
      if (roleFound) setTargetRole(roleFound);

      // 1. Fetch Skill Assessments (for Assessment Score)
      const assessments = await api.getAssessments().catch(() => []);
      if (assessments && assessments.length > 0) {
        setAssessmentScore(assessments[0].score);
      } else {
        setAssessmentScore(null);
      }

      // 3. Fetch Employability Score
      const empData = await api.getEmployability().catch(() => null);
      if (empData?.overallScore) {
        setEmployabilityScore(empData.overallScore);
      }

      // 4. Fetch Career DNA Archetype
      const careerDna = await api.getCareerDNA().catch(() => null);
      if (careerDna?.archetype) {
        setCareerDnaArchetype(careerDna.archetype);
      }
      if (careerDna?.tagline) {
        setDnaTagline(careerDna.tagline);
      }

      // 5. Fetch Company Readiness
      const compReadiness = await api
        .getLatestCompanyReadiness()
        .catch(() => null);
      setCompanyReadiness(compReadiness);

      // 6. Fetch Career Twin
      const twin = await api.getLatestCareerTwin().catch(() => null);
      setCareerTwin(twin);

      // 5. Fetch Enrolled/Active Courses
      const courses = await api.getMyCourses().catch(() => []);
      if (courses && courses.length > 0) {
        const totalProgress = courses.reduce(
          (sum: number, c: any) => sum + (c.progress || 0),
          0,
        );
        setLearningProgress(Math.round(totalProgress / courses.length));

        const active = courses.find((c: any) => c.progress < 100) || courses[0];
        setActiveCourse(active);
      }

      // 6. Fetch Skill Gap Analysis
      const gap = await api.getSkillGap().catch(() => null);
      if (gap) {
        setSkillGap(gap);
      }

      // 7. Fetch Career Paths dynamically
      const paths = await api.getCareerPaths().catch(() => []);
      if (paths && paths.length > 0) {
        const gradients = [
          "bg-gradient-primary",
          "bg-gradient-pink",
          "bg-gradient-blue",
        ];
        setRecommendedPaths(
          paths.slice(0, 3).map((p: any, idx: number) => ({
            title: p.role,
            pct: p.matchPercentage,
            tags: p.requiredSkills.slice(0, 2),
            gradient: gradients[idx % gradients.length],
          })),
        );
      } else {
        setRecommendedPaths([]);
      }

      // 7. Fetch Recommended Courses
      const recCourses = await api.getRecommendedCourses().catch(() => []);
      setRecommendedCourses(recCourses);

      // 8. Notifications
      const notifs = await api.getNotifications().catch(() => []);
      if (notifs) {
        setUnreadNotifs(notifs.some((n: any) => !n.read));
      }
    } catch (err) {
      console.error("Dashboard dynamic load error:", err);
    } finally {
      setHasResume((prev) => (prev === null ? false : prev));
    }
  }


  useEffect(() => {
    // Initial load from localStorage for instant display
    const stored = localStorage.getItem("userName");
    if (stored) setUserName(stored);

    loadDashboardData();

    // Automatic synchronization on window focus and document visibility
    const handleFocus = () => {
      loadDashboardData();
    };
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleFocus();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 10s background sync interval
    const interval = setInterval(loadDashboardData, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [navigate]);

  return (
    <AppShell>
      {/* Header Bar */}
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs md:text-sm font-semibold text-muted-foreground">Welcome back,</p>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">{userName}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/profile"
            className="h-10 w-10 rounded-full bg-card border border-border/60 shadow-sm flex items-center justify-center text-primary hover:bg-muted/40 transition"
            title="Profile & Settings"
          >
            <User className="h-5 w-5" />
          </Link>
          <Link
            to="/notifications"
            className="h-10 w-10 rounded-full bg-card border border-border/60 shadow-sm flex items-center justify-center relative hover:bg-muted/40 transition text-muted-foreground hover:text-foreground"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifs && (
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card" />
            )}
          </Link>
        </div>
      </header>

      {hasResume === null ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="relative mb-5">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills, courses..."
              className="w-full h-12 rounded-2xl bg-card border border-border/60 pl-11 pr-4 shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-medium"
            />
          </div>

          {/* Ask AI Assistant Card */}
          <Link to="/ai-assistant" className="block mb-5 group">
            <div className="rounded-3xl p-5 bg-gradient-primary text-white shadow-glow flex items-center gap-4 hover:opacity-95 transition">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0">
                ✨
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">Ask AI Assistant</p>
                <p className="text-xs text-white/80">
                  Get personalized career guidance and instant AI answers
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-white/70 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Employability Score Hero Banner */}
          <div className="rounded-3xl p-6 bg-gradient-to-r from-primary to-primary-hover text-white shadow-glow mb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/80">Employability Index</p>
                <p className="text-3xl md:text-4xl font-black mt-1">
                  {employabilityScore || 85}/100
                </p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-white shrink-0">
                <Award className="h-7 w-7" />
              </div>
            </div>
            <p className="text-xs text-white/85 mt-3 leading-relaxed">
              Top candidate ready for software and AI engineering roles. Backed by live platform analytics.
            </p>
          </div>

          {/* AI Resume ATS Score Card */}
          <div className="rounded-3xl p-5 bg-card border border-border/60 shadow-card mb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">AI Resume ATS Score</p>
                <p className="text-2xl md:text-3xl font-black mt-1 text-foreground">
                  {atsScore !== null ? `${atsScore}%` : "Not Scanned"}
                </p>
              </div>
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileText className="h-5.5 w-5.5" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {targetRole
                ? `Target role: ${targetRole}. Matched against live industry benchmarks.`
                : "Resume ATS evaluation backed by live industry benchmarks."}
            </p>
          </div>

          {/* Career DNA Archetype Card */}
          <div className="rounded-3xl p-5 bg-card border border-border/60 shadow-card mb-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <Brain className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Career DNA Archetype</p>
              <p className="text-base font-black text-foreground truncate">{careerDnaArchetype || "System Architect"}</p>
              <p className="text-xs text-muted-foreground truncate">{dnaTagline || "Analytical & High-Impact Builder"}</p>
            </div>
          </div>

          {/* Platform Features & Tools Quick Action Grid */}
          <div className="mb-5">
            <h2 className="text-sm md:text-base font-bold text-foreground mb-3">
              Platform Features & Tools
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Link
                to="/career"
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-md transition group"
              >
                <div className="h-11 w-11 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 mb-2.5 group-hover:scale-105 transition-transform">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition">Career Paths</span>
              </Link>

              <Link
                to="/jobs"
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-md transition group"
              >
                <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2.5 group-hover:scale-105 transition-transform">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition">Browse Jobs</span>
              </Link>

              <Link
                to="/courses"
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-md transition group"
              >
                <div className="h-11 w-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-2.5 group-hover:scale-105 transition-transform">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition">Courses</span>
              </Link>

              <Link
                to="/skill-gap"
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-md transition group"
              >
                <div className="h-11 w-11 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-600 mb-2.5 group-hover:scale-105 transition-transform">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition">Skill Gap</span>
              </Link>

              <Link
                to="/career-twin"
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-md transition group"
              >
                <div className="h-11 w-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 mb-2.5 group-hover:scale-105 transition-transform">
                  <Brain className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition">Career Twin</span>
              </Link>

              <Link
                to="/company-readiness"
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-md transition group"
              >
                <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-2.5 group-hover:scale-105 transition-transform">
                  <Award className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-foreground group-hover:text-primary transition">Readiness</span>
              </Link>

              {/* AI Mock Interview Simulator - full width */}
              <Link
                to="/interview-prep"
                className="col-span-2 sm:col-span-3 flex items-center gap-3.5 p-4 rounded-2xl bg-card border border-border/60 shadow-card hover:border-primary/40 hover:shadow-md transition group"
              >
                <div className="h-11 w-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-bold text-foreground group-hover:text-primary transition">
                    AI Mock Interview Simulator
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Practice real-world technical & behavioral questions
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
              </Link>
            </div>
          </div>

          {/* Personalized AI Roadmap Banner */}
          <Link
            to="/roadmap-generator"
            className="flex items-center justify-between p-4.5 rounded-2xl bg-gradient-primary text-white shadow-glow mb-6 hover:opacity-95 transition group"
          >
            <div className="flex items-center gap-3">
              <GitFork className="h-5 w-5" />
              <span className="font-bold text-sm">View Personalized AI Roadmap</span>
            </div>
            <ChevronRight className="h-5 w-5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </>
      )}
    </AppShell>
  );
}
