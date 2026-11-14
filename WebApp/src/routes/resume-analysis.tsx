import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Award,
  Clock,
  Briefcase,
  History,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/client";
import { toast } from "sonner";

export const Route = createFileRoute("/resume-analysis")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Resume — CognifyAI" }] }),
  component: ResumeAnalysis,
});

function ResumeAnalysis() {
  const [profile, setProfile] = useState<any>(null);
  const [latestReport, setLatestReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [targetJob, setTargetJob] = useState("Software Engineer");
  const [showHistory, setShowHistory] = useState(false);

  const loadResumeData = async () => {
    try {
      const [profileData, reportData, historyData] = await Promise.all([
        api.getProfile().catch(() => null),
        api.getLatestAtsReport().catch(() => null),
        api.getResumeHistory().catch(() => []),
      ]);

      setProfile(profileData);
      setLatestReport(reportData);
      setHistory(Array.isArray(historyData) ? historyData : []);

      if (profileData?.target_role) {
        setTargetJob(profileData.target_role);
      }
    } catch (err) {
      console.error("Failed to load resume details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumeData();

    // Cross-platform automatic synchronization on window focus & document visibility
    const handleFocus = () => {
      loadResumeData();
    };
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadResumeData();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 10s background sync interval
    const interval = setInterval(loadResumeData, 10000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading(`Uploading ${file.name} to AI ATS engine...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("targetJob", targetJob || "Software Engineer");

      const res = await api.uploadResume(formData);
      toast.success("Resume uploaded and analyzed successfully!", { id: toastId });
      setLatestReport(res);
      await loadResumeData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process resume.", { id: toastId });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  // Determine active resume details from report or profile
  const resumeDetails = latestReport || profile?.resumeDetails || null;
  const atsScore =
    resumeDetails?.score ??
    resumeDetails?.ats_score ??
    (resumeDetails ? 85 : null);

  const predictedRole =
    resumeDetails?.predicted_role ??
    resumeDetails?.predictedRole ??
    profile?.target_role ??
    targetJob;

  const strengths: string[] =
    resumeDetails?.strengths ||
    resumeDetails?.detected_skills ||
    resumeDetails?.skills ||
    [];

  const weaknesses: string[] =
    resumeDetails?.weaknesses ||
    resumeDetails?.missing_skills ||
    [];

  const recommendations: string[] =
    resumeDetails?.recommendations ||
    resumeDetails?.improvements ||
    [];

  const fileName =
    resumeDetails?.file_name ||
    resumeDetails?.resume_url ||
    "resume.pdf";

  return (
    <AppShell>
      <PageHeader title="Resume & ATS Optimization" back="/dashboard" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Banner / Upload Zone */}
          <div className="rounded-3xl p-6 bg-card shadow-card border border-border/10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  AI ATS Resume Optimization
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Synchronized across Web and Mobile with instant ML scoring
                </p>
              </div>
              {resumeDetails && (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                  Active
                </span>
              )}
            </div>

            {/* Target Role Selector */}
            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Target Role for ATS Benchmark
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={targetJob}
                  onChange={(e) => setTargetJob(e.target.value)}
                  placeholder="e.g. Senior Full Stack Engineer"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Drag & Drop / File Input Dropzone */}
            <label
              htmlFor="resume-upload-input"
              className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                uploading
                  ? "border-primary bg-primary/5 cursor-wait"
                  : "border-border/60 bg-background/50 hover:bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center text-white shadow-glow">
                  {uploading ? (
                    <RefreshCw className="h-7 w-7 animate-spin" />
                  ) : (
                    <UploadCloud className="h-7 w-7" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {uploading
                      ? "Running TF-IDF & ML Analysis..."
                      : resumeDetails
                      ? "Click to Replace Resume (PDF or TXT)"
                      : "Upload Resume to Score & Match"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Evaluated directly through the CognifyAI ML Pipeline
                  </p>
                </div>
              </div>
              <input
                id="resume-upload-input"
                type="file"
                accept=".pdf,.txt,.docx"
                disabled={uploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Active Resume ATS Result Card */}
          {resumeDetails && (
            <div className="rounded-3xl p-6 bg-card shadow-card border border-border/10 space-y-5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-black text-2xl shadow-glow">
                    {atsScore}%
                  </div>
                  <div>
                    <p className="text-sm font-bold text-card-foreground">
                      ATS Optimization Score
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Active File: <span className="font-semibold text-foreground">{fileName}</span>
                    </p>
                  </div>
                </div>
                <Award className="h-8 w-8 text-primary" />
              </div>

              {predictedRole && (
                <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center gap-2.5">
                  <Sparkles className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Predicted Role:{" "}
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {predictedRole}
                    </span>
                  </div>
                </div>
              )}

              {/* Strengths & Extracted Skills */}
              {strengths.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Key Verified Strengths & Skills</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {strengths.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Identified Gaps / Missing Skills */}
              {weaknesses.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>Identified Skill Gaps for {targetJob}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {weaknesses.map((w, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-bold"
                      >
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actionable Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    ML Actionable Recommendations
                  </p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground pl-1">
                    {recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Audit History Toggle & Section */}
          <div className="rounded-3xl p-6 bg-card shadow-card border border-border/10 space-y-4">
            <div
              onClick={() => setShowHistory(!showHistory)}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-sm">
                    Resume Upload & Audit History
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {history.length} past scans recorded
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`h-5 w-5 text-muted-foreground transition-transform ${
                  showHistory ? "rotate-90" : ""
                }`}
              />
            </div>

            {showHistory && (
              <div className="space-y-2.5 pt-2 border-t border-border/40">
                {history.length > 0 ? (
                  history.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3.5 rounded-2xl bg-background border border-border/60 flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-semibold text-xs text-foreground">
                            {item.file_name || item.filename || "Resume Audit"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString()
                              : "Recent"}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs">
                        {item.score || item.ats_score || 85}% ATS
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No past audit scans found.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
