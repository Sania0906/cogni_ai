import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  Bell, Search, Award, BookOpen, Brain, GitFork, 
  Flame, CheckCircle, LineChart, FileText, Monitor, ShieldAlert, Sparkles, Upload, Building, User
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
  head: () => ({ meta: [{ title: "Dashboard — CognifyAI" }] }),
  component: Dashboard,
});

const aiModules = [
  { to: "/career", label: "Career DNA", icon: Brain, color: "text-primary", bg: "bg-primary/10" },
  { to: "/skill-gap", label: "Skill Gap", icon: Flame, color: "text-warning", bg: "bg-warning/10" },
  { to: "/career-success", label: "Success Rate", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  { to: "/industry-demand", label: "Market Intel", icon: LineChart, color: "text-pink", bg: "bg-pink/10" },
  { to: "/roadmap-generator", label: "AI Roadmap", icon: GitFork, color: "text-primary", bg: "bg-primary/10" },
  { to: "/employability", label: "Employability", icon: Award, color: "text-warning", bg: "bg-warning/10" },
  { to: "/skill-growth", label: "Growth Engine", icon: Sparkles, color: "text-success", bg: "bg-success/10" },
  { to: "/platform-analytics", label: "Platform Metrics", icon: Monitor, color: "text-primary", bg: "bg-primary/10" },
  { to: "/career-forecasting", label: "Career Forecast", icon: ShieldAlert, color: "text-warning", bg: "bg-warning/10" },
  { to: "/company-readiness", label: "Company Readiness", icon: Building, color: "text-primary", bg: "bg-primary/10" },
  { to: "/career-twin", label: "Career Twin", icon: User, color: "text-success", bg: "bg-success/10" },
];

function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("User");
  const [unreadNotifs, setUnreadNotifs] = useState(false);
  const [recommendedPaths, setRecommendedPaths] = useState<any[]>([]);
  const [activeCourse, setActiveCourse] = useState<any>(null);

  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scanProgress, setScanProgress] = useState("");

  // Dynamic Dashboard Career Index metrics
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [assessmentScore, setAssessmentScore] = useState<number | null>(null);
  const [employabilityScore, setEmployabilityScore] = useState<number | null>(null);
  const [learningProgress, setLearningProgress] = useState<number | null>(null);
  const [careerDnaArchetype, setCareerDnaArchetype] = useState<string | null>(null);
  const [companyReadiness, setCompanyReadiness] = useState<any>(null);
  const [careerTwin, setCareerTwin] = useState<any>(null);
  
  // Skill Gap Analysis State
  const [skillGap, setSkillGap] = useState<{
    targetRole: string;
    matchPercentage: number;
    skills: { name: string; current: number; required: number; gap: number; status: string }[];
  } | null>(null);

  // Recommended Courses State
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);

  async function loadDashboardData() {
    try {
      const profile = await api.getProfile();
      if (profile?.name) {
        setUserName(profile.name);
        localStorage.setItem("userName", profile.name);
      }

      // Check if resume exists
      const atsReport = await api.getLatestAtsReport().catch(() => null);
      const resumeScore = atsReport?.score || profile?.resumeDetails?.ats_score;
      const resumeUploaded = !!resumeScore;
      setHasResume(resumeUploaded);

      if (!resumeUploaded) {
        // Fetch notifications even if no resume is uploaded
        const notifs = await api.getNotifications().catch(() => []);
        if (notifs) {
          setUnreadNotifs(notifs.some((n: any) => !n.read));
        }
        return;
      }

      setAtsScore(resumeScore);

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

      // 5. Fetch Company Readiness
      const compReadiness = await api.getLatestCompanyReadiness().catch(() => null);
      setCompanyReadiness(compReadiness);

      // 6. Fetch Career Twin
      const twin = await api.getLatestCareerTwin().catch(() => null);
      setCareerTwin(twin);

      // 5. Fetch Enrolled/Active Courses
      const courses = await api.getMyCourses().catch(() => []);
      if (courses && courses.length > 0) {
        const totalProgress = courses.reduce((sum: number, c: any) => sum + (c.progress || 0), 0);
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
        const gradients = ["bg-gradient-primary", "bg-gradient-pink", "bg-gradient-blue"];
        setRecommendedPaths(paths.slice(0, 3).map((p: any, idx: number) => ({
          title: p.role,
          pct: p.matchPercentage,
          tags: p.requiredSkills.slice(0, 2),
          gradient: gradients[idx % gradients.length]
        })));
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
    }
  }

  useEffect(() => {
    // Initial load from localStorage for instant display
    const stored = localStorage.getItem("userName");
    if (stored) setUserName(stored);

    loadDashboardData();
  }, [navigate]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await triggerAtsScan(file);
    }
  };

  const triggerAtsScan = async (file: File) => {
    setUploading(true);
    setScanProgress("Uploading resume to secure storage...");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetJob", "Senior Data Scientist");

      await new Promise(r => setTimeout(r, 600));
      setScanProgress("Parsing document structure and extracting key sections...");
      await new Promise(r => setTimeout(r, 600));
      setScanProgress("Analyzing skill matches and optimizing profile details...");
      await new Promise(r => setTimeout(r, 600));
      setScanProgress("Finalizing ATS scorecard matching...");

      await api.optimizeResume(formData);
      toast.success("Resume analyzed successfully!");
      
      setHasResume(true);
      await loadDashboardData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse and analyze resume.");
    } finally {
      setUploading(false);
      setScanProgress("");
    }
  };

  return (
    <AppShell>
      <header className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-2xl font-bold">{userName}</h1>
        </div>
        <Link
          to="/notifications"
          className="h-10 w-10 rounded-full bg-card shadow-card flex items-center justify-center relative"
        >
          <Bell className="h-5 w-5" />
          {unreadNotifs && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-card" />
          )}
        </Link>
      </header>

      {hasResume === null ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !hasResume ? (
        <div className="rounded-3xl bg-white/15 backdrop-blur-xl border border-white/25 p-8 text-center space-y-6 shadow-card bg-card">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Upload Your Resume</h2>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Upload your professional resume (PDF, DOCX, or TXT) to instantly generate your ATS Score, Career DNA, Skill Gaps, and custom AI insights.
            </p>
          </div>

          {uploading ? (
            <div className="space-y-4 py-4">
              <div className="flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
              <p className="text-xs font-bold text-primary animate-pulse">{scanProgress}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <label
                htmlFor="resume-input"
                className="mx-auto flex h-32 max-w-xs cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition"
              >
                <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="font-bold text-primary">Click to select file</span>
                  <span>or drag & drop here</span>
                </div>
                <input
                  type="file"
                  id="resume-input"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Search skills */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              placeholder="Search skills, courses..."
              className="w-full h-14 rounded-2xl bg-card pl-12 pr-4 shadow-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Ask AI Assistant */}
          <Link to="/ai-assistant" className="block mb-6">
            <div className="rounded-3xl p-5 bg-gradient-primary text-white shadow-glow flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">✨</div>
              <div className="flex-1">
                <p className="font-bold">Ask AI Assistant</p>
                <p className="text-sm text-white/80">Get personalized career guidance</p>
              </div>
            </div>
          </Link>

          {/* Personalized Career Index Grid */}
          <h2 className="text-xl font-bold mb-3">Your Career Index</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* ATS Score */}
            <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">ATS Score</span>
                <span className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <p className="text-2xl font-black mt-2 text-card-foreground">
                {atsScore !== null ? `${atsScore}/100` : "Loading..."}
              </p>
              <p className="text-[9px] text-muted-foreground mt-1">Resume screening match</p>
            </div>

            {/* Assessment Score */}
            <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">Assessment</span>
                <span className="h-2 w-2 rounded-full bg-success" />
              </div>
              <p className="text-2xl font-black mt-2 text-card-foreground">
                {assessmentScore !== null ? `${assessmentScore}/100` : "Loading..."}
              </p>
              <p className="text-[9px] text-muted-foreground mt-1">Skill test benchmark</p>
            </div>

            {/* Employability Score */}
            <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">Employability</span>
                <span className="h-2 w-2 rounded-full bg-pink" style={{ backgroundColor: "oklch(0.65 0.24 350)" }} />
              </div>
              <p className="text-2xl font-black mt-2 text-card-foreground">
                {employabilityScore !== null ? `${employabilityScore}/100` : "Loading..."}
              </p>
              <p className="text-[9px] text-muted-foreground mt-1">Composite hiring rating</p>
            </div>

            {/* Learning Progress */}
            <div className="p-4.5 rounded-2xl bg-card shadow-card border border-border/10">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">Learning</span>
                <span className="h-2 w-2 rounded-full bg-warning" />
              </div>
              <p className="text-2xl font-black mt-2 text-card-foreground">
                {learningProgress !== null ? `${learningProgress}%` : "0%"}
              </p>
              <p className="text-[9px] text-muted-foreground mt-1">Course progress</p>
            </div>

            {/* Career DNA Archetype */}
            <div className="col-span-1 p-4.5 rounded-2xl bg-card shadow-card border border-border/10 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">DNA Archetype</span>
                <p className="text-sm font-extrabold text-card-foreground mt-1">
                  {careerDnaArchetype || "Generating..."}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0 ml-2">
                🧬
              </div>
            </div>

            {/* Career Twin Identity */}
            <Link to="/career-twin" className="col-span-1 p-4.5 rounded-2xl bg-card shadow-card border border-border/10 flex justify-between items-center hover:scale-[1.02] transition-transform">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-extrabold tracking-wider">Career Twin</span>
                <p className="text-sm font-extrabold text-card-foreground mt-1 truncate">
                  {careerTwin?.personality || "Generate Twin..."}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center font-bold text-lg shrink-0 ml-2">
                <User className="h-5 w-5" />
              </div>
            </Link>
          </div>

          {/* Company Readiness Analysis Section */}
          {companyReadiness ? (
            <div className="rounded-3xl p-5 bg-card shadow-card border border-border/10 mb-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Building className="h-5 w-5 text-primary" /> Company Readiness: {companyReadiness.company_name}
                </h2>
                <Link to="/company-readiness" className="text-xs font-bold text-primary hover:underline">
                  View Full Report
                </Link>
              </div>
              <div className="mb-4">
                <p className="text-sm font-extrabold text-foreground">Target Role: {companyReadiness.target_role}</p>
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground mt-1">
                  <span>Alignment Score</span>
                  <span className="text-primary">{companyReadiness.readiness_score}% Match</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${companyReadiness.readiness_score}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl p-5 bg-card shadow-card border border-dashed border-border/40 mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                  <Building className="h-5 w-5 text-muted-foreground" /> Company Readiness
                </h2>
                <p className="text-xs text-muted-foreground mt-1">See how you stack up against top tech companies.</p>
              </div>
              <Link to="/company-readiness" className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/20 transition">
                Analyze
              </Link>
            </div>
          )}

          {/* Skill Gap Analysis Section */}
          {skillGap && (
            <div className="rounded-3xl p-5 bg-card shadow-card border border-border/10 mb-6">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2 text-foreground">
                <Flame className="h-5 w-5 text-warning" /> Skill Gap Analysis
              </h2>
              <div className="mb-4">
                <p className="text-sm font-extrabold text-foreground">Target Role: {skillGap.targetRole}</p>
                <div className="flex justify-between items-center text-xs font-bold text-muted-foreground mt-1">
                  <span>Overall Alignment</span>
                  <span className="text-primary">{skillGap.matchPercentage}% Match</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${skillGap.matchPercentage}%` }} />
                </div>
              </div>
              <div className="space-y-3 mt-4">
                {skillGap.skills.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">Current: {s.current}% | Required: {s.required}%</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${
                      s.status === "Match" 
                        ? "bg-success/10 text-success" 
                        : "bg-warning/10 text-warning"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Innovation modules grid */}
          <h2 className="text-xl font-bold mb-3">AI Intelligence Hub</h2>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {aiModules.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card shadow-card border border-border/20 transition-all hover:scale-[1.02] relative"
              >
                <div className={`h-10 w-10 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                </div>
                <span className="text-xs font-bold leading-tight">{m.label}</span>
              </Link>
            ))}
          </div>

          {/* Recommended Career Paths */}
          <h2 className="text-xl font-bold mb-3">Recommended Career Path</h2>
          <div className="space-y-3 mb-8">
            {recommendedPaths.length > 0 ? (
              recommendedPaths.map((m) => (
                <Link
                  to="/career"
                  key={m.title}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-card shadow-card"
                >
                  <div className={`h-14 w-14 rounded-2xl ${m.gradient} flex items-center justify-center text-white`}>
                    <Award className="h-7 w-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground mb-2">{m.pct}% match based on your skills</p>
                    <div className="flex gap-2 flex-wrap">
                      {m.tags.map((t, i) => (
                        <span
                          key={t}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                            i === 0 ? "bg-accent text-accent-foreground" : "bg-pink/10 text-pink"
                          }`}
                          style={i === 1 ? { color: "oklch(0.55 0.24 350)", backgroundColor: "oklch(0.65 0.24 350 / 0.12)" } : undefined}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-6 rounded-2xl bg-card border border-border/10 text-center text-xs text-muted-foreground">
                No recommended paths found. Please upload your resume to generate matches!
              </div>
            )}
          </div>

          {/* Recommended Courses Section */}
          {recommendedCourses.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                <BookOpen className="h-5.5 w-5.5 text-primary" /> Recommended Courses
              </h2>
              <div className="space-y-3">
                {recommendedCourses.map((course, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-card shadow-card border border-border/10 flex flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{course.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Duration: {course.duration} | {course.difficulty}</p>
                      </div>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0">
                        {course.provider || "CognifyAI Academy"}
                      </span>
                    </div>
                    <div className="h-px bg-border/40" />
                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                      &quot;{course.reason}&quot;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Course progress */}
          {activeCourse && (
            <>
              <h2 className="text-xl font-bold mb-3">Continue Learning</h2>
              <Link to="/courses" className="block p-4 rounded-2xl bg-card shadow-card">
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold">{activeCourse.title}</p>
                    <p className="text-xs text-muted-foreground">{activeCourse.progress}% completed</p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${activeCourse.progress}%` }} />
                </div>
              </Link>
            </>
          )}
        </>
      )}
    </AppShell>
  );
}
