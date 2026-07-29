import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/client";

export const Route = createFileRoute("/resume-analysis")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !localStorage.getItem("token")) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({ meta: [{ title: "Resume Analysis — CognifyAI" }] }),
  component: ResumeAnalysis,
});

function ResumeAnalysis() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getProfile();
        setProfile(data);
      } catch (err) {
        console.error("Failed to load profile details for resume analysis", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <AppShell>
      <PageHeader title="Resume Analysis" back="/dashboard" />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : profile?.resumeDetails ? (
        <div className="space-y-6">
          <div className="rounded-3xl p-6 bg-card shadow-card border border-border/10 space-y-4">
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              📄 Resume ATS Analysis
            </h3>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 flex items-center justify-center rounded-2xl bg-gradient-blue text-white font-black text-xl shadow-glow">
                {profile.resumeDetails.ats_score}%
              </div>
              <div>
                <p className="text-sm font-bold text-card-foreground">ATS Optimization Score</p>
                <p className="text-xs text-muted-foreground mt-0.5">Parsed details and improvements detected below</p>
              </div>
            </div>

            {profile.resumeDetails.skills && profile.resumeDetails.skills.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Extracted Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.resumeDetails.skills.map((s: string) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.resumeDetails.improvements && profile.resumeDetails.improvements.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key Improvements Recommended</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-2 pl-1 leading-relaxed">
                  {profile.resumeDetails.improvements.map((imp: string, index: number) => (
                    <li key={index}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl p-6 bg-card shadow-card text-center border border-dashed border-border/40 py-12 space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">No resume analysis available.</p>
          <Link
            to="/dashboard"
            className="inline-block px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-glow"
          >
            Go to Dashboard to Upload Resume
          </Link>
        </div>
      )}
    </AppShell>
  );
}
