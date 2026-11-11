import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/resume-upload")({


  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Resume Upload — CognifyAI" }] }),
  component: ResumeUpload,
});

function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [targetJob, setTargetJob] = useState("Software Engineer");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      let data: any;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("targetJob", targetJob);
        data = await api.uploadResume(formData);
      } else if (resumeText.trim()) {
        data = await api.uploadResume({ resumeText, targetJob });
      } else {
        setError("Please select a file or paste your resume text.");
        setLoading(false);
        return;
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to upload resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Resume Upload & Parsing" back="/dashboard" />

      <div className="max-w-3xl mx-auto space-y-6">
        <form onSubmit={handleUpload} className="rounded-3xl p-6 bg-card shadow-card border border-border/10 space-y-4">
          <h3 className="text-lg font-bold text-card-foreground">Upload Resume (PDF / Text)</h3>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Target Job Role
            </label>
            <input
              type="text"
              value={targetJob}
              onChange={(e) => setTargetJob(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Machine Learning Engineer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Select Resume File (PDF / DOCX)
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            />
          </div>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-border/40"></div>
            <span className="flex-shrink mx-4 text-xs font-bold text-muted-foreground">OR PASTE TEXT</span>
            <div className="flex-grow border-t border-border/40"></div>
          </div>

          <div>
            <textarea
              rows={5}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here..."
              className="w-full p-4 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-glow hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {loading ? "Analyzing Resume..." : "Analyze Resume"}
          </button>
        </form>

        {result && (
          <div className="rounded-3xl p-6 bg-card shadow-card border border-border/10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-blue text-white font-black text-2xl shadow-glow">
                {result.ats_score}%
              </div>
              <div>
                <h4 className="text-lg font-bold text-card-foreground">ATS Resume Analysis Result</h4>
                <p className="text-xs text-muted-foreground">Uploaded: {result.resume_url}</p>
              </div>
            </div>

            {result.detected_skills && result.detected_skills.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detected Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {result.detected_skills.map((s: string) => (
                    <span key={s} className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.missing_skills && result.missing_skills.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Missing Recommended Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((s: string) => (
                    <span key={s} className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-600 text-xs font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
